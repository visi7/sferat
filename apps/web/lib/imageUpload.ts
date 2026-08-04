// Fotot e kamerës në iPhone (dhe disa Android të rinj) ruhen si default në
// HEIC/HEIF -- format që s'e deshifron dot asnjë shfletues (Chrome, Firefox,
// Edge, Android WebView) brenda një <img>, vetëm Safari/iOS. Bucket-i
// "images" në Supabase Storage s'ka kufizim mime-type, kështu që HEIC
// ngarkohej pa gabim, por shfaqej si "broken image" te kushdo tjetër
// përveç uploader-it (nëse ai ishte në Safari). Kjo e konverton në JPEG
// PARA ngarkimit, në browser, me heic2any (WASM) -- transparente për
// përdoruesin.
export async function prepareImageFile(file: File): Promise<File> {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.hei[cf]$/i.test(file.name);

  if (!isHeic) return file;

  const heic2any = (await import("heic2any")).default;
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  const newName = file.name.replace(/\.hei[cf]$/i, ".jpg");
  return new File([blob], newName || "photo.jpg", { type: "image/jpeg" });
}
