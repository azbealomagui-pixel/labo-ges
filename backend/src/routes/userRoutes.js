// ===========================================
// INSCRIPTION D'UN NOUVEL UTILISATEUR (POST /register)
// ===========================================
router.post('/register', async (req, res) => {
  try {
    const { nom, prenom, email, password } = req.body;

    // Validation des champs
    const missingFields = [];
    if (!nom) missingFields.push('nom');
    if (!prenom) missingFields.push('prenom');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont obligatoires',
        required: missingFields
      });
    }

    // Validation email
    if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format email invalide'
      });
    }

    // Validation mot de passe
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Créer l'utilisateur (le pre-save hook va hasher le mot de passe)
    const newUser = new User({
      nom: nom.trim(),
      prenom: prenom.trim(),
      email: email.toLowerCase().trim(),
      password: password,  // ← En clair, sera hashé par pre-save
      role: 'manager_labo',
      estProprietaire: false
    });

    await newUser.save();
    
    // Vérifier que le mot de passe a bien été hashé
    if (!newUser.password.startsWith('$2b$')) {
      console.error('⚠️ ATTENTION: Le mot de passe n\'a pas été hashé pour', email);
    }

    const userResponse = newUser.toPublicJSON();

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      user: userResponse
    });

  } catch (error) {
    console.error('❌ Erreur inscription:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});