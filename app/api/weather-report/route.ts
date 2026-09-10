import { NextResponse } from "next/server";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  const city = "Lome";
  const weatherApiKey = process.env.OPENWEATHER_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;

  try {
    // 1. Récupère les données météo
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${weatherApiKey}&units=metric&lang=fr`
    );
    if (!weatherRes.ok) throw new Error(`Erreur OpenWeather: ${weatherRes.status}`);
    const weatherData = await weatherRes.json();

    const donneesMeteo = {
      ville: weatherData.name,
      temperature: weatherData.main.temp,
      description: weatherData.weather[0].description,
      humidite: weatherData.main.humidity,
      vent: weatherData.wind.speed,
    };

    // 2. Génère le résumé avec Groq
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [{
          role: "user",
          content: `Voici les données météo du jour pour ${donneesMeteo.ville} : température ${donneesMeteo.temperature}°C, ${donneesMeteo.description}, humidité ${donneesMeteo.humidite}%, vent ${donneesMeteo.vent} m/s. Rédige un résumé court et naturel (3-4 phrases) en français, avec une recommandation pratique pour la journée.`,
        }],
      }),
    });
    if (!groqRes.ok) throw new Error(`Erreur Groq: ${groqRes.status}`);
    const groqData = await groqRes.json();
    const resume = groqData.choices[0].message.content;

    // 3. Envoie l'email avec Resend
    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev',  // Remplace par ton email vérifié sur Resend
      to: 'diallomariamasadi9@gmail.com',   // Remplace par ton email de test
      subject: `Résumé météo pour ${donneesMeteo.ville} - ${new Date().toLocaleDateString('fr-FR')}`,
      html: `<p><strong>Résumé météo du jour :</strong> ${resume}</p>
             <p><strong>Données brutes :</strong> ${JSON.stringify(donneesMeteo, null, 2)}</p>`,
    });
    if (error) {
      console.error("Erreur Resend :", error);
      throw new Error("Échec de l'envoi de l'email");
    }

    // 4. Retourne la réponse
    return NextResponse.json({
      donneesBrutes: donneesMeteo,
      resumeIA: resume,
      emailEnvoye: true,
    });
  } catch (error) {
    return NextResponse.json(
      { erreur: `Erreur dans le pipeline : ${String(error)}` },
      { status: 500 }
    );
  }
}