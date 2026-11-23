// Default-off in every environment. A controlled build may deliberately
// re-enable the preserved module after backend approval is configured too.
export const ENABLE_EMPLOYEE_RECONCILIATION =
  import.meta.env.VITE_ENABLE_EMPLOYEE_RECONCILIATION === 'true';
