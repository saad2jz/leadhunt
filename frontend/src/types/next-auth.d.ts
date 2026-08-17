import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      organisationId: string;
      plan: string;
      modulesActifs: string[];
    };
  }

  interface User {
    id: string;
    email: string;
    role: string;
    organisationId: string;
    plan: string;
    modulesActifs: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    organisationId: string;
    plan: string;
    modulesActifs: string[];
  }
}
