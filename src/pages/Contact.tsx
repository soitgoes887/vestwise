import React from 'react';

const Contact: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Get in Touch</h1>

        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <p className="text-gray-700 text-center mb-8">
            Have questions, feedback, or suggestions? We'd love to hear from you!
          </p>

          <div className="space-y-6">
            <div className="border-l-4 border-indigo-600 pl-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Email</h3>
              <a
                href="mailto:hello@vestwise.com"
                className="text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                hello@vestwise.com
              </a>
            </div>

            <div className="border-l-4 border-purple-600 pl-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Feedback</h3>
              <p className="text-gray-700">
                We're constantly improving Vestwise. If you have ideas for new features or improvements,
                please don't hesitate to reach out.
              </p>
            </div>

            <div className="border-l-4 border-green-600 pl-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Bug Reports</h3>
              <p className="text-gray-700">
                Found a calculation error or technical issue? Please report it so we can fix it quickly.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 rounded-lg border-2 border-indigo-200 p-8">
          <h2 className="text-2xl font-semibold text-indigo-900 mb-4 text-center">
            Quick Contact Form
          </h2>
          <form className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <select
                id="subject"
                name="subject"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option>General Inquiry</option>
                <option>Feature Request</option>
                <option>Bug Report</option>
                <option>Feedback</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Tell us what's on your mind..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Send Message
            </button>
          </form>

          <p className="text-sm text-gray-600 text-center mt-4">
            Note: This form is currently for demonstration purposes. Please use the email address above.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Contact;
