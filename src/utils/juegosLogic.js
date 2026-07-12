export function generarSopaDeLetras(palabrasObj, size = 15) {
  const grid = Array(size).fill(null).map(() => Array(size).fill(''));
  
  const dirs = [
    [0, 1],   // horizontal derecha
    [1, 0],   // vertical abajo
    [1, 1],   // diagonal abajo derecha
    [-1, 1],  // diagonal arriba derecha
  ];

  const placeWord = (word) => {
    for (let attempts = 0; attempts < 150; attempts++) {
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const startR = Math.floor(Math.random() * size);
      const startC = Math.floor(Math.random() * size);

      let canPlace = true;
      for (let i = 0; i < word.length; i++) {
        const r = startR + dir[0] * i;
        const c = startC + dir[1] * i;
        
        if (r < 0 || r >= size || c < 0 || c >= size) {
          canPlace = false;
          break;
        }
        if (grid[r][c] !== '' && grid[r][c] !== word[i]) {
          canPlace = false;
          break;
        }
      }

      if (canPlace) {
        for (let i = 0; i < word.length; i++) {
          const r = startR + dir[0] * i;
          const c = startC + dir[1] * i;
          grid[r][c] = word[i];
        }
        return true;
      }
    }
    return false; 
  };

  const palabrasColocadas = [];
  palabrasObj.forEach(p => {
    // Normalizar palabra (quitar acentos, dejar solo A-Z)
    const cleanWord = p.palabra.toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z]/g, '');
      
    if (cleanWord.length > 0 && placeWord(cleanWord)) {
      palabrasColocadas.push(p); // Guardamos la info original si se pudo colocar
    }
  });

  // Rellenar espacios vacíos
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
  }

  return { grid, palabrasColocadas };
}
