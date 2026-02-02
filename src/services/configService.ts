import { supabase } from '../lib/supabase';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

export interface SavedConfig {
  rsuGrants?: any[];
  esppConfig?: any;
  params?: any;
  baseCurrency?: 'USD' | 'GBP';
  selectedCompany?: {
    name: string;
    ticker: string;
    exchange: string;
    country: 'US' | 'UK';
  } | null;
  // Pension calculator fields
  pensionPots?: any[];
  pensionInputs?: {
    pensionableIncome: string;
    ownContributionPct: string;
    employerContributionPct: string;
    currentAge: string;
    retirementAge: string;
    annualReturn: string;
  };
  // Compensation fields
  baseSalaryConfig?: any;
  bonusConfig?: any;
  carAllowanceConfig?: any;
  // Add a type discriminator
  configType: 'rsu' | 'pension';
}

export interface ConfigResponse {
  id: string;
  user_id: string;
  config_type: 'rsu' | 'pension';
  name: string | null;
  config_data: SavedConfig;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}

export async function listConfigs(configType?: 'rsu' | 'pension'): Promise<ConfigResponse[]> {
  const headers = await getAuthHeaders();
  const url = configType
    ? `${API_BASE}/configs?config_type=${configType}`
    : `${API_BASE}/configs`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('listConfigs error:', response.status, errorText);
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function getConfig(id: string): Promise<ConfigResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/configs/${id}`, { headers });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Configuration not found');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function saveConfig(
  config: SavedConfig,
  name?: string,
  isDefault?: boolean,
  existingId?: string
): Promise<ConfigResponse> {
  const headers = await getAuthHeaders();

  if (existingId) {
    // Update existing config
    const response = await fetch(`${API_BASE}/configs/${existingId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        config_data: config,
        name,
        is_default: isDefault,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('updateConfig error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    return response.json();
  } else {
    // Create new config
    const response = await fetch(`${API_BASE}/configs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        config_type: config.configType,
        config_data: config,
        name,
        is_default: isDefault ?? false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('createConfig error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
}

export async function deleteConfig(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/configs/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

export async function renameConfig(id: string, newName: string): Promise<ConfigResponse> {
  const headers = await getAuthHeaders();
  // If empty string, generate a docker-style name
  const name = newName.trim() || generateReadableName();

  const response = await fetch(`${API_BASE}/configs/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Legacy function for backward compatibility - now just wraps saveConfig
export async function loadConfig(id: string): Promise<SavedConfig> {
  const config = await getConfig(id);
  return config.config_data;
}

// Helper to generate a memorable name for configs
export function generateReadableName(): string {
  const adjectives = [
    'quick', 'happy', 'bright', 'calm', 'wise', 'bold', 'smart', 'cool',
    'brave', 'clever', 'gentle', 'kind', 'swift', 'proud', 'noble', 'keen',
    'fierce', 'silent', 'mighty', 'grand', 'wild', 'free', 'pure', 'true',
    'strong', 'sharp', 'deep', 'golden', 'silver', 'royal', 'cosmic', 'mystic',
  ];

  const nouns = [
    'fox', 'bear', 'eagle', 'lion', 'wolf', 'tiger', 'hawk', 'owl',
    'falcon', 'raven', 'dragon', 'phoenix', 'lynx', 'panther', 'leopard', 'cheetah',
    'titan', 'giant', 'warrior', 'knight', 'sage', 'wizard',
    'comet', 'meteor', 'nebula', 'galaxy', 'quasar', 'pulsar', 'nova', 'supernova',
  ];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}-${noun}`;
}

// Keep for backward compatibility
export function generateReadableUUID(): string {
  return generateReadableName();
}
