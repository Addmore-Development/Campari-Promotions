import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma, JWT_SECRET, JWT_EXPIRES_IN } from '../config';
import { AuthRequest } from '../middleware/auth';
import { auditLog } from '../utils/auditLogger';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      // Support both naming conventions from frontend
      name, fullName,
      email, password, role, consentPopia,
      // Promoter fields
      phone, idNumber, city, province,
      gender, height, clothingSize, shoeSize,
      bankName, accountNumber, branchCode,
      experience, industry: promoterIndustry,
      languages,
      // Business fields
      companyName, contactName, companyReg, vatNumber,
      industry: bizIndustry,
    } = req.body;

    const displayName = fullName || name || '';

    if (!displayName || !email || !password) {
      res.status(400).json({ error: 'name, email and password are required' });
      return;
    }

    if (role === 'PROMOTER' && !consentPopia) {
      res.status(400).json({ error: 'POPIA consent is required to register as a promoter' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const normalizedRole = (role?.toUpperCase() || 'PROMOTER') as any;
    const isBusiness = normalizedRole === 'BUSINESS';

    const user = await prisma.user.create({
      data: {
        fullName:         isBusiness ? (companyName || displayName) : displayName,
        email:            email.toLowerCase().trim(),
        password:         hashed,
        role:             normalizedRole,
        consentPopia:     !!consentPopia,
        status:           'pending_review',
        onboardingStatus: 'pending_review',

        // Shared
        phone:            phone        || null,
        city:             city         || null,
        province:         province     || null,

        // Promoter-specific
        idNumber:         !isBusiness ? (idNumber      || null) : null,
        gender:           !isBusiness ? (gender        || null) : null,
        height:           !isBusiness && height ? parseInt(String(height)) : null,
        clothingSize:     !isBusiness ? (clothingSize  || null) : null,
        shoeSize:         !isBusiness ? (shoeSize      || null) : null,
        bankName:         !isBusiness ? (bankName      || null) : null,
        accountNumber:    !isBusiness ? (accountNumber || null) : null,
        branchCode:       !isBusiness ? (branchCode    || null) : null,
        industry:         !isBusiness ? (promoterIndustry || null) : (bizIndustry || null),

        // Business-specific
        contactName:      isBusiness ? (contactName || displayName) : null,
        vatNumber:        isBusiness ? (vatNumber   || null)        : null,
        address:          isBusiness ? (companyReg  || null)        : null,
      },
    });

    // Audit log — non-fatal
    try {
      await auditLog({ userId: user.id, action: 'REGISTER', entity: 'User', entityId: user.id });
    } catch (auditErr) {
      console.error('[Auth] auditLog failed (non-fatal):', auditErr);
    }

    // Return token so frontend can immediately upload documents
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as any
    );

    res.status(201).json({
      message: 'Registration successful — pending admin review',
      userId:  user.id,
      token,
      user: {
        id:               user.id,
        name:             user.fullName,
        email:            user.email,
        role:             user.role,
        status:           user.status,
        onboardingStatus: user.onboardingStatus,
      },
    });
  } catch (err: any) {
    console.error('[Auth] register error:', err);
    // Return the actual Prisma/DB error message in dev for easier debugging
    const msg = process.env.NODE_ENV === 'production'
      ? 'Registration failed'
      : (err?.message || 'Registration failed');
    res.status(500).json({ error: msg });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    console.log('[Auth] login attempt for:', email);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      console.log('[Auth] user not found:', email);
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log('[Auth] password mismatch for:', email);
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as any
    );

    // Audit log — wrapped in try/catch so a Redis/DB issue doesn't break login
    try {
      await auditLog({ userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id });
    } catch (auditErr) {
      console.error('[Auth] auditLog failed (non-fatal):', auditErr);
    }

    console.log('[Auth] login success for:', email, 'role:', user.role);

    res.json({
      token,
      user: {
        id:               user.id,
        name:             user.fullName,
        email:            user.email,
        role:             user.role,
        status:           user.status,
        onboardingStatus: user.onboardingStatus,
        profilePhotoUrl:  user.profilePhotoUrl,
        headshotUrl:      user.headshotUrl,
        city:             user.city,
      },
    });
  } catch (err: any) {
    console.error('[Auth] login error:', err);
    const msg = process.env.NODE_ENV === 'production'
      ? 'Login failed'
      : (err?.message || 'Login failed');
    res.status(500).json({ error: msg });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id:               true,
        fullName:         true,
        email:            true,
        role:             true,
        status:           true,
        onboardingStatus: true,
        phone:            true,
        city:             true,
        province:         true,
        address:          true,
        reliabilityScore: true,
        consentPopia:     true,
        createdAt:        true,
        rejectionReason:  true,
        // Business fields
        contactName:  true,
        vatNumber:    true,
        industry:     true,
        website:      true,
        // Documents
        profilePhotoUrl:  true,
        headshotUrl:      true,
        fullBodyPhotoUrl: true,
        cvUrl:            true,
        cipcDocUrl:       true,
        taxPinUrl:        true,
        bizBankProofUrl:  true,
        // Promoter fields
        idNumber:      true,
        gender:        true,
        height:        true,
        clothingSize:  true,
        shoeSize:      true,
        bankName:      true,
        accountNumber: true,
        branchCode:    true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (err: any) {
    console.error('[Auth] getMe error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      res.status(401).json({ error: 'Current password incorrect' });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    try {
      await auditLog({ userId: user.id, action: 'CHANGE_PASSWORD', entity: 'User', entityId: user.id });
    } catch (auditErr) {
      console.error('[Auth] auditLog failed (non-fatal):', auditErr);
    }

    res.json({ message: 'Password updated successfully' });
  } catch (err: any) {
    console.error('[Auth] changePassword error:', err);
    res.status(500).json({ error: 'Password change failed' });
  }
};