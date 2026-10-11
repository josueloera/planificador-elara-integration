// La misma imagen se guarda en el perfil y se utiliza en ALUMNO y en los gafetes.
export async function prepararFotoAlumno(file) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Selecciona una imagen para la foto.');
  if (file.size > 20 * 1024 * 1024) throw new Error('La foto original no puede superar 20 MB.');
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer la foto.'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo abrir la foto. Prueba con JPG, PNG o WebP.'));
    img.src = source;
  });
  const scale = Math.min(1, 800 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar la foto.');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}
