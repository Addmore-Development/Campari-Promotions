// promoter/onboarding/RegisterUploadDocs.tsx
// Onboarding is handled at /register — this route is a redirect stub.

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const RegisterUploadDocs: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate('/register', { replace: true }); }, [navigate]);
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0A0A0A', color:'#666', fontSize:'14px' }}>
      Redirecting to registration…
    </div>
  );
};