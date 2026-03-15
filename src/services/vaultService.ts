export function maskValue(value: string): string {
  if (value.length <= 4) return '••••';
  if (value.length <= 8) return '••••' + value.slice(-2);
  return '••••••••••' + value.slice(-4);
}

export function validateApiKey(key: string, service: string): boolean {
  if (!key || key.length < 8) return false;
  const patterns: Record<string, RegExp> = {
    openai: /^sk-[A-Za-z0-9]{20,}/,
    anthropic: /^sk-ant-[A-Za-z0-9_-]{20,}/,
    github: /^gh[ps]_[A-Za-z0-9]{20,}/,
  };
  const pattern = patterns[service.toLowerCase()];
  return pattern ? pattern.test(key) : key.length >= 16;
}

export function generateId(): string {
  return `vault_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const SERVICE_ICONS: Record<string, string> = {
  openai: '🤖', anthropic: '🔮', github: '🐙', shodan: '🌐',
  virustotal: '🦠', abuseipdb: '🚫', censys: '🔭', greynoise: '☁️',
  alienvault: '👽', securitytrails: '🛤️', urlvoid: '🔗',
  default: '🔑',
};

export function getServiceIcon(service: string): string {
  return SERVICE_ICONS[service.toLowerCase()] ?? SERVICE_ICONS.default;
}

export const KNOWN_SERVICES = [
  'OpenAI', 'Anthropic', 'GitHub', 'Shodan', 'VirusTotal',
  'AbuseIPDB', 'GreyNoise', 'Censys', 'AlienVault OTX',
  'SecurityTrails', 'URLVoid', 'Custom',
];
