import jwt from 'jsonwebtoken';
import supabase from '../db/supabase.js';

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — no token provided' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: current, error } = await supabase.from('users')
      .select('id, role, is_super_admin, account_status, department, department_id, session_version')
      .eq('id', decoded.id).maybeSingle();
    if (error || !current || current.account_status !== 'approved' || decoded.sessionVersion !== current.session_version) {
      return res.status(401).json({ error: 'Your session expired or account access changed. Please sign in again.' });
    }
    req.user = {
      ...decoded,
      role: current.role,
      isSuperAdmin: current.is_super_admin,
      accountStatus: current.account_status,
      department: current.department,
      departmentId: current.department_id,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized — invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden — insufficient role' });
    }
    next();
  };
}
