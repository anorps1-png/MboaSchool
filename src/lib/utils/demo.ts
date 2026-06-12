export function isDemoSchool(): boolean {
  if (typeof window === 'undefined') return true;
  
  const currentSchool = localStorage.getItem('mboaschool_current_school');
  const offlineSession = localStorage.getItem('mboaschool_offline_session');
  
  let email = '';
  if (offlineSession) {
    try {
      const parsed = JSON.parse(offlineSession);
      email = parsed.email || '';
    } catch (e) {}
  }
  
  // It is a custom school if the school name is set and is not Collège Vogt - Yaoundé,
  // or if the logged-in email is not one of the default demo emails.
  if (currentSchool && currentSchool !== 'Collège Vogt - Yaoundé') {
    return false;
  }
  
  if (email && email !== 'admin@mboaschool.com' && email !== 'directeur@mboaschool.com') {
    return false;
  }
  
  return true;
}
