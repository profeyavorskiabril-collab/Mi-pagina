
module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método no permitido" });
    }

    const { email, password } = req.body || {};
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || typeof password !== "string" || !password) {
        return res.status(400).json({
            error: "Correo y contraseña requeridos."
        });
    }

    const URL = process.env.SUPABASE_URL;
    const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!URL || !KEY) {
        return res.status(500).json({
            error: "Falta configurar Supabase en el servidor."
        });
    }

    try {
        const creacion = await fetch(`${URL}/auth/v1/admin/users`, {
            method: "POST",
            headers: {
                apikey: KEY,
                Authorization: `Bearer ${KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: normalizedEmail,
                password: password,
                email_confirm: true
            })
        });

        const resultado = await creacion.json();

        if (!creacion.ok) {
            return res.status(400).json({
                error: resultado.msg || resultado.message ||
                    "No se pudo crear la cuenta. Revisá el correo y la contraseña."
            });
        }

        const usuarioId = resultado.id;

        const perfil = await fetch(`${URL}/rest/v1/usuarios`, {
            method: "POST",
            headers: {
                apikey: KEY,
                Authorization: `Bearer ${KEY}`,
                "Content-Type": "application/json",
                "Content-Profile": "public",
                Prefer: "return=minimal"
            },
            body: JSON.stringify({
                email: normalizedEmail,
                rol: "cliente",
                favoritos: [],
                auth_user_id: usuarioId
            })
        });

        if (!perfil.ok) {
            const detalle = await perfil.text();
            console.error("Error creando perfil:", detalle);

            // Eliminar la cuenta Auth si no se pudo crear su perfil.
            await fetch(`${URL}/auth/v1/admin/users/${usuarioId}`, {
                method: "DELETE",
                headers: {
                    apikey: KEY,
                    Authorization: `Bearer ${KEY}`
                }
            });

            throw new Error("No se pudo crear el perfil del usuario.");
        }

        return res.status(200).json({
            success: true,
            message: "Cuenta creada correctamente."
        });

    } catch (error) {
        console.error("Error registrando usuario:", error);

        return res.status(500).json({
            error: error.message || "No se pudo completar el registro."
        });
    }
};
