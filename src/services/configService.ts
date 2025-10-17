// Lambda Function URLs from Pulumi output
// Replace these with your actual Lambda Function URLs after deployment
const SAVE_URL = process.env.REACT_APP_SAVE_CONFIG_URL || 'YOUR_SAVE_LAMBDA_URL';
const LOAD_URL = process.env.REACT_APP_LOAD_CONFIG_URL || 'YOUR_LOAD_LAMBDA_URL';

export interface SavedConfig {
  rsuGrants: any[];
  esppConfig: any;
  params: any;
}

export async function saveConfig(uuid: string, config: SavedConfig): Promise<{ success: boolean; uuid: string }> {
  try {
    const response = await fetch(SAVE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uuid, config })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving config:', error);
    throw error;
  }
}

export async function loadConfig(uuid: string): Promise<SavedConfig> {
  try {
    const response = await fetch(`${LOAD_URL}?uuid=${uuid}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Configuration not found');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error loading config:', error);
    throw error;
  }
}

// Helper to generate a memorable UUID
export function generateReadableUUID(): string {
  const adjectives = [
    'quick', 'happy', 'bright', 'calm', 'wise', 'bold', 'smart', 'cool',
    'brave', 'clever', 'gentle', 'kind', 'swift', 'proud', 'noble', 'keen',
    'fierce', 'silent', 'mighty', 'grand', 'wild', 'free', 'pure', 'true',
    'strong', 'sharp', 'deep', 'golden', 'silver', 'royal', 'cosmic', 'mystic',
    'ancient', 'modern', 'vivid', 'serene', 'radiant', 'stellar', 'lunar', 'solar',
    'arctic', 'tropic', 'crystal', 'velvet', 'marble', 'bronze', 'iron', 'steel',
    'forest', 'ocean', 'storm', 'thunder', 'frost', 'fire', 'wind', 'shadow',
    'light', 'dawn', 'dusk', 'azure', 'crimson', 'violet', 'jade', 'amber'
  ];

  const nouns = [
    'fox', 'bear', 'eagle', 'lion', 'wolf', 'tiger', 'hawk', 'owl',
    'falcon', 'raven', 'dragon', 'phoenix', 'lynx', 'panther', 'leopard', 'cheetah',
    'jaguar', 'cougar', 'cobra', 'viper', 'python', 'shark', 'whale', 'dolphin',
    'orca', 'manta', 'titan', 'giant', 'warrior', 'knight', 'sage', 'wizard',
    'ranger', 'hunter', 'scout', 'guardian', 'sentinel', 'champion', 'hero', 'master',
    'comet', 'meteor', 'nebula', 'galaxy', 'quasar', 'pulsar', 'nova', 'supernova',
    'mountain', 'river', 'canyon', 'valley', 'summit', 'peak', 'cliff', 'glacier',
    'thunder', 'lightning', 'tempest', 'cyclone', 'typhoon', 'aurora', 'horizon', 'zenith'
  ];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 99999); // 5 digits for more combinations
  return `${adj}-${noun}-${num}`;
}