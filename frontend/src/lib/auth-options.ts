import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { prisma } from './prisma';
import bcrypt from 'bcrypt';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Veuillez saisir votre adresse email et votre mot de passe.');
        }

        const user = await prisma.utilisateur.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: { organisation: true },
        });

        if (!user) {
          throw new Error('Identifiants de connexion incorrects.');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isPasswordValid) {
          throw new Error('Identifiants de connexion incorrects.');
        }

        let modulesArray: string[] = [];
        try {
          modulesArray = JSON.parse(user.organisation.modulesActifs || '[]');
        } catch (e) {
          modulesArray = [];
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          organisationId: user.organisationId,
          plan: user.organisation.plan,
          modulesActifs: modulesArray,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'placeholder',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder',
    }),
    AzureADProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID || 'placeholder',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'placeholder',
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.organisationId = (user as any).organisationId;
        token.plan = (user as any).plan;
        token.modulesActifs = (user as any).modulesActifs;
      }

      // Pour les OAuth
      if (account && (account.provider === 'google' || account.provider === 'azure-ad')) {
        if (token.email) {
          const emailLower = token.email.toLowerCase().trim();
          let dbUser = await prisma.utilisateur.findUnique({
            where: { email: emailLower },
            include: { organisation: true },
          });

          if (!dbUser) {
            const defaultOrg = await prisma.organisation.create({
              data: {
                nom: `Organisation ${token.name || token.email}`,
                modulesActifs: JSON.stringify(['sirene', 'pipeline', 'dashboard', 'liste_noire']),
                plan: 'starter',
              },
            });

            dbUser = await prisma.utilisateur.create({
              data: {
                email: emailLower,
                passwordHash: await bcrypt.hash(Math.random().toString(36).substring(2, 15), 10),
                role: 'Manager',
                organisationId: defaultOrg.id,
              },
              include: { organisation: defaultOrg as any }, // avoid TS query error
            });
            // Fetch again to ensure structure is exactly correct
            dbUser = await prisma.utilisateur.findUnique({
              where: { id: dbUser.id },
              include: { organisation: true },
            }) as any;
          }

          let modulesArray: string[] = [];
          try {
            modulesArray = JSON.parse(dbUser!.organisation.modulesActifs || '[]');
          } catch (e) {
            modulesArray = [];
          }

          token.id = dbUser!.id;
          token.role = dbUser!.role;
          token.organisationId = dbUser!.organisationId;
          token.plan = dbUser!.organisation.plan;
          token.modulesActifs = modulesArray;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).organisationId = token.organisationId;
        (session.user as any).plan = token.plan;
        (session.user as any).modulesActifs = token.modulesActifs;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
