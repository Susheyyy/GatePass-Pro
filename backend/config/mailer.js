const sendEmail = async ({ to, subject, text, html }) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured. Email cannot be sent.');
  }

  const from = process.env.RESEND_FROM || 'GatePass Pro <onboarding@resend.dev>';
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        text,
        ...(html && { html })
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Resend API returned status ${response.status}`);
    }
    console.log('Email sent successfully via Resend API!');
    return data;
  } catch (error) {
    console.error('Mail Send Error (Resend API):', error.message);
    throw error;
  }
};

module.exports = { sendEmail };

