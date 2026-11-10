/**
 * Formats any address representation (string, JSON string, or address object)
 * into a safe, clean, human-readable string suitable for rendering in React JSX.
 */
export function formatAddress(address: any): string {
  if (!address) return '';
  
  if (typeof address === 'string') {
    const trimmed = address.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return formatAddress(parsed);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  if (typeof address === 'object') {
    const parts = [
      address.attention ? `Attn: ${address.attention}` : '',
      address.street1 || address.addressLine1 || (typeof address.address === 'string' ? address.address : ''),
      address.street2 || address.addressLine2 || '',
      address.city || '',
      address.state || '',
      address.pinCode || address.postalCode || address.zipCode || '',
      address.country || '',
    ]
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter(Boolean);

    return parts.join(', ');
  }

  return '';
}
