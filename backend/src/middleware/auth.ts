import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { JWT_SECRET } from '../config';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}


export const protect = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};


export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};

export const promoterOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'PROMOTER') {
    res.status(403).json({ error: 'Promoter access required' });
    return;
  }
  next();
};

export const adminOrBusiness = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!['ADMIN', 'BUSINESS'].includes(req.user?.role || '')) {
    res.status(403).json({ error: 'Admin or Business access required' });
    return;
  }
  next();
};
