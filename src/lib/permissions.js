// Matrice de droits granulaires attribuables aux COMPANY_ADMIN.
export const PERMISSIONS = [
  { key: 'manage_prizes', label: 'Gérer les lots' },
  { key: 'configure_wheel', label: 'Configurer la roue / réglages' },
  { key: 'manage_qrcodes', label: 'Gérer les QR codes' },
  { key: 'view_customers', label: 'Voir les clients' },
  { key: 'moderate_reviews', label: 'Modérer les avis' },
  { key: 'view_stats', label: 'Voir les statistiques' },
];

export const ALL_PERMISSIONS = PERMISSIONS.map((p) => p.key);

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
};

export function parsePermissions(json) {
  try {
    const arr = JSON.parse(json || '[]');
    return Array.isArray(arr) ? arr.filter((k) => ALL_PERMISSIONS.includes(k)) : [];
  } catch {
    return [];
  }
}
