
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Método no permitido"
        });
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
        // 1. Comprobar las credenciales antiguas en el servidor.
        const parametros = new URLSearchParams({
            email: `eq.${normalizedEmail}`,
            password: `eq.${password}`,
            select: "id,email",
            limit: "1"
        });

        const consulta = await fetch(
            `${URL}/rest/v1/usuarios?${parametros.toString()}`,
            {
                headers: {
                    apikey: KEY,
                    Authorization: `Bearer ${KEY}`
                }
            }
        );

if (!consulta.ok) {
    const detalle = await consulta.text();

    console.error("ERROR CONSULTANDO USUARIOS:", {
        estado: consulta.status,
        detalle: detalle
    });

    throw new Error("Error consultando usuarios: " + consulta.status);
}

        const usuarios = await consulta.json();

        if (!Array.isArray(usuarios) || usuarios.length === 0) {
            return res.status(401).json({
                error: "El correo o la contraseña no coinciden con la cuenta antigua."
            });
        }

        // 2. Crear la cuenta en Supabase Auth con la misma contraseña.
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
            if (
                resultado.code === "email_exists" ||
                resultado.msg === "A user with this email address has already been registered"
            ) {
                return res.status(409).json({
                    error: "Esta cuenta ya existe en el nuevo sistema. Ingresá con la contraseña que utilizaste al recuperarla."
                });
            }

            throw new Error(
                resultado.message || resultado.msg || "No se pudo crear la cuenta."
            );
        }

        return res.status(200).json({
            success: true,
            message: "Cuenta migrada correctamente."
        });

    } catch (error) {
        console.error("Error migrando cuenta:", error);

        return res.status(500).json({
            error: "No se pudo completar la migración."
        });
    }
}
