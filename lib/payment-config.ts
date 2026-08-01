export async function getMercadoPagoKeys() {
  let publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || 'APP_USR-b343fbe6-e222-471a-b884-fd1750f350a6';
  let accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-6306619536658105-122509-d955510d74358f43b75f4d5b790303a6-136107970';

  try {
    const fetchPromise = (async () => {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      const docRef = doc(db, 'app_settings', 'config');
      return await getDoc(docRef);
    })();

    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore timeout')), 1200)
    );

    const docSnap = (await Promise.race([fetchPromise, timeoutPromise])) as any;
    if (docSnap && docSnap.exists && docSnap.exists()) {
      const data = docSnap.data();
      if (data.mpPublicKey) {
        publicKey = data.mpPublicKey;
      }
      if (data.mpAccessToken) {
        accessToken = data.mpAccessToken;
      }
    }
  } catch (e: any) {
    // Quiet warning when falling back
  }

  return { publicKey, accessToken };
}
