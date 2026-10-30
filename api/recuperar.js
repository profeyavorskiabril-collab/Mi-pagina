
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método no permitido" });
    }

    const { email } = req.body || {};
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
        return res.status(400).json({ error: "Correo requerido" });
    }

    const URL = process.env.SUPABASE_URL;
    const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
        // Comprobar que el correo existe en la tabla original
        const consulta = await fetch(
           `${URL}/rest/v1/usuarios?email=ilike.${encodeURIComponent(normalizedEmail)}&select=id&limit=1`,
            {
                headers: {
                    apikey: KEY,
                    Authorization: `Bearer ${KEY}`
                }
            }
        );

        const usuarios = await consulta.json();

        if (!consulta.ok || !usuarios.length) {
            return res.status(404).json({
                error: "No encontramos una cuenta con ese correo."
            });
        }

        // Crear la cuenta Auth si todavía no existe
        const temporal = crypto.randomUUID() + "Aa9!";

        const creacion = await fetch(`${URL}/auth/v1/admin/users`, {
            method: "POST",
            headers: {
                apikey: KEY,
                Authorization: `Bearer ${KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: normalizedEmail,
                password: temporal,
                email_confirm: true
            })
        });

        const resultado = await creacion.json();

        // Si ya existe en Auth, continuamos con la recuperación.
        if (!creacion.ok &&
            resultado.code !== "email_exists" &&
            resultado.msg !== "A user with this email address has already been registered") {
            throw new Error(resultado.message || resultado.msg || "No se pudo crear la cuenta.");
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("Error recuperación:", error);
        return res.status(500).json({ error: "Error al preparar la recuperación." });
    }
}
