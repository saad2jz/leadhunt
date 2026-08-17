import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envoie un email transactionnel (onboarding, réinitialisation de mot de passe, sequences).
 * En mode développement (ou si la clé API n'est pas configurée), l'email est simplement logué dans la console.
 */
export async function envoyerEmail({ to, subject, html }: EmailParams) {
  const isDev = process.env.NODE_ENV === 'development';
  const hasApiKey = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_placeholder';

  if (isDev || !hasApiKey) {
    console.log('==================================================');
    console.log(`[DEV EMAIL] Envoi d'un email :`);
    console.log(`Destinataire : ${to}`);
    console.log(`Sujet        : ${subject}`);
    console.log(`Contenu HTML :`);
    console.log(html);
    console.log('==================================================');
    return { success: true, mock: true };
  }

  try {
    const data = await resend.emails.send({
      from: 'Prospect Intelligence <onboarding@resend.dev>', // Ou votre domaine vérifié
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email via Resend :", error);
    return { success: false, error };
  }
}
