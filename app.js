(() => {
  const shell = document.querySelector(".app-shell");
  const backButton = document.querySelector("#backButton");
  const restartButton = document.querySelector("#restartButton");
  const bookwormMenuCanvas = document.querySelector("#bookwormMenuCanvas");
  const candyScoreEl = document.querySelector("#candyScore");
  const candyMovesEl = document.querySelector("#candyMoves");

  const candyTypes = [
    { name: "Star Book", color: "#1f69cf", accent: "star" },
    { name: "Cactus Book", color: "#cf4631", accent: "cactus" },
    { name: "Compass Book", color: "#76a820", accent: "compass" },
    { name: "Diamond Book", color: "#7f43a7", accent: "diamond" },
    { name: "Locked Book", color: "#8f5427", accent: "lock" },
    { name: "Bible Book", color: "#202020", accent: "cross" },
    { name: "Globe", color: "#2d8ec8", accent: "globe" },
    { name: "Scroll", color: "#f1d7a7", accent: "scroll" },
    { name: "Forbes Magazine", color: "#111111", accent: "magazine" },
    { name: "Tumbleweed", color: "#d99a3a", accent: "tumbleweed" },
    { name: "Wanted Poster", color: "#c58b45", accent: "poster" },
    { name: "Magnet", color: "#c94b35", accent: "magnet", powerup: true, boosterSprite: 3 },
    { name: "TNT", color: "#df3428", accent: "tnt", powerup: true, boosterSprite: 5 },
  ];

  const isPowerupType = (type) => candyTypes[type]?.powerup === true;
  const deweyStarThresholds = [0, 10000, 20000];
  const magnetType = candyTypes.findIndex((type) => type.accent === "magnet");
  const tntType = candyTypes.findIndex((type) => type.accent === "tnt");
  const powerupDrawOffsets = {
    magnet: { x: 0.2, y: 0 },
    tnt: { x: 0.18, y: -0.18 },
  };

  const deweyImages = {
    background: new Image(),
    ui: new Image(),
    pieces: new Image(),
    sign: new Image(),
    lighthouseBook: new Image(),
    puzzleBook: new Image(),
    bibleBook: new Image(),
    forbesMagazine: new Image(),
    tumbleweed: new Image(),
    wantedPoster: new Image(),
  };

  deweyImages.background.src = "assets/dewey/background.png";
  deweyImages.ui.src = "assets/dewey/ui-atlas.png";
  deweyImages.pieces.src = "assets/dewey/pieces-atlas.png";
  deweyImages.sign.src = "assets/dewey/sign-dewey-disorder.png";
  deweyImages.lighthouseBook.src = "assets/dewey/book-lighthouse.png";
  deweyImages.puzzleBook.src = "assets/dewey/book-puzzle.png";
  deweyImages.bibleBook.src = "assets/dewey/book-bible.png";
  deweyImages.forbesMagazine.src = "assets/dewey/book-forbes-magazine.png";
  deweyImages.tumbleweed.src = "assets/dewey/tumbleweed.png";
  deweyImages.wantedPoster.src = "assets/dewey/wanted-poster.png";

  const deweyPieceSprites = [
    { x: 96, y: 53, w: 254, h: 291 },
    { x: 428, y: 40, w: 250, h: 274 },
    { x: 761, y: 41, w: 246, h: 273 },
    { x: 1080, y: 40, w: 255, h: 276 },
    { x: 97, y: 382, w: 234, h: 277 },
    { x: 450, y: 382, w: 232, h: 271 },
    { x: 796, y: 355, w: 222, h: 277 },
    { x: 1085, y: 395, w: 273, h: 221 },
  ];

  const deweyBoosterSprites = [
    { x: 37, y: 672, w: 240, h: 284 },
    { x: 333, y: 678, w: 272, h: 288 },
    { x: 621, y: 680, w: 230, h: 289 },
    { x: 792, y: 688, w: 262, h: 284 },
    { x: 1134, y: 696, w: 228, h: 248 },
    { x: 1296, y: 646, w: 236, h: 312 },
  ];

  const imageLoaded = (image) => image.complete && image.naturalWidth > 0;

  let activeGame = null;
  let lastFrame = performance.now();

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const randInt = (max) => Math.floor(Math.random() * max);
  const cellKey = (col, row) => `${col},${row}`;
  const bookwormHighScoreKey = "bookwormWatchHighScore";
  const deweyHighScoreKey = "deweyDisorderHighScore";
  const readStoredNumber = (key, fallback = 0) => {
    try {
      if (typeof localStorage === "undefined") return fallback;
      const value = Number(localStorage.getItem(key));
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
    } catch {
      return fallback;
    }
  };
  const writeStoredNumber = (key, value) => {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, String(Math.max(0, Math.floor(value))));
    } catch {
      // Ignore storage failures; the game still works without persistence.
    }
  };
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutBack = (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function canvasPoint(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function drawCross(ctx, x, y, size, fill = "#ffd44d", stroke = "#4e3424") {
    const w = size * 0.28;
    const h = size;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
    ctx.rect(-h / 2, -w / 2, h, w);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawCactus(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#46d074";
    ctx.strokeStyle = "#0c6b3a";
    ctx.lineWidth = Math.max(1, size * 0.08);
    roundedRect(ctx, -size * 0.16, -size * 0.5, size * 0.32, size * 0.94, size * 0.16);
    ctx.fill();
    ctx.stroke();
    roundedRect(ctx, -size * 0.46, -size * 0.16, size * 0.24, size * 0.46, size * 0.12);
    ctx.fill();
    ctx.stroke();
    roundedRect(ctx, size * 0.22, -size * 0.32, size * 0.24, size * 0.52, size * 0.12);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.44)";
    ctx.lineWidth = Math.max(1, size * 0.04);
    ctx.beginPath();
    ctx.moveTo(-size * 0.04, -size * 0.4);
    ctx.lineTo(-size * 0.04, size * 0.34);
    ctx.moveTo(size * 0.09, -size * 0.34);
    ctx.lineTo(size * 0.09, size * 0.28);
    ctx.stroke();
    ctx.restore();
  }

  function drawBook(ctx, x, y, size, cover = "#e84d5b") {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.06);
    roundedRect(ctx, -size * 0.5, -size * 0.34, size, size * 0.72, size * 0.08);
    ctx.fillStyle = cover;
    ctx.fill();
    ctx.strokeStyle = "#641821";
    ctx.lineWidth = Math.max(1, size * 0.07);
    ctx.stroke();
    ctx.fillStyle = "#ffeec2";
    roundedRect(ctx, size * 0.2, -size * 0.28, size * 0.22, size * 0.56, size * 0.04);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = Math.max(1, size * 0.035);
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, -size * 0.18);
    ctx.lineTo(size * 0.06, -size * 0.18);
    ctx.moveTo(-size * 0.3, size * 0.02);
    ctx.lineTo(size * 0.05, size * 0.02);
    ctx.stroke();
    ctx.restore();
  }

  function drawPuzzle(ctx, x, y, size, fill = "#b85cff") {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = fill;
    ctx.strokeStyle = "#4b236d";
    ctx.lineWidth = Math.max(1, size * 0.07);
    roundedRect(ctx, -size * 0.44, -size * 0.44, size * 0.88, size * 0.88, size * 0.14);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -size * 0.44, size * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.arc(size * 0.22, size * 0.18, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLighthouse(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(255,244,166,0.34)";
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.55);
    ctx.lineTo(size * 0.58, -size * 0.2);
    ctx.lineTo(size * 0.12, -size * 0.08);
    ctx.lineTo(0, -size * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff2cf";
    ctx.strokeStyle = "#4b5568";
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.beginPath();
    ctx.moveTo(-size * 0.22, size * 0.48);
    ctx.lineTo(size * 0.22, size * 0.48);
    ctx.lineTo(size * 0.14, -size * 0.3);
    ctx.lineTo(-size * 0.14, -size * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e84d5b";
    ctx.fillRect(-size * 0.16, -size * 0.06, size * 0.32, size * 0.12);
    ctx.fillRect(-size * 0.18, size * 0.18, size * 0.36, size * 0.12);
    ctx.fillStyle = "#ffd44d";
    roundedRect(ctx, -size * 0.18, -size * 0.46, size * 0.36, size * 0.2, size * 0.04);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawDogPaw(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#f7fbff";
    ctx.strokeStyle = "#71839a";
    ctx.lineWidth = Math.max(1, size * 0.05);
    ctx.beginPath();
    ctx.ellipse(0, size * 0.15, size * 0.26, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (const toe of [
      [-0.28, -0.2],
      [-0.09, -0.31],
      [0.12, -0.31],
      [0.31, -0.2],
    ]) {
      ctx.beginPath();
      ctx.ellipse(size * toe[0], size * toe[1], size * 0.11, size * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAussieLibrarian(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#f6fbff";
    ctx.strokeStyle = "#567087";
    ctx.lineWidth = Math.max(1, size * 0.04);
    ctx.beginPath();
    ctx.ellipse(0, size * 0.12, size * 0.48, size * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#d6dde7";
    ctx.beginPath();
    ctx.moveTo(-size * 0.36, -size * 0.08);
    ctx.lineTo(-size * 0.58, -size * 0.42);
    ctx.lineTo(-size * 0.14, -size * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#c8b18c";
    ctx.beginPath();
    ctx.moveTo(size * 0.34, -size * 0.08);
    ctx.lineTo(size * 0.58, -size * 0.42);
    ctx.lineTo(size * 0.14, -size * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#24313f";
    ctx.beginPath();
    ctx.arc(-size * 0.16, size * 0.06, size * 0.04, 0, Math.PI * 2);
    ctx.arc(size * 0.16, size * 0.06, size * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#172231";
    ctx.lineWidth = Math.max(1, size * 0.035);
    ctx.beginPath();
    ctx.arc(-size * 0.16, size * 0.05, size * 0.11, 0, Math.PI * 2);
    ctx.arc(size * 0.16, size * 0.05, size * 0.11, 0, Math.PI * 2);
    ctx.moveTo(-size * 0.05, size * 0.05);
    ctx.lineTo(size * 0.05, size * 0.05);
    ctx.stroke();
    ctx.fillStyle = "#202a36";
    ctx.beginPath();
    ctx.ellipse(0, size * 0.18, size * 0.08, size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2fd8c8";
    roundedRect(ctx, -size * 0.28, size * 0.32, size * 0.56, size * 0.16, size * 0.04);
    ctx.fill();
    ctx.restore();
  }

  function drawFamilyHome(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#b45834";
    ctx.beginPath();
    ctx.moveTo(-size * 0.62, -size * 0.06);
    ctx.lineTo(0, -size * 0.58);
    ctx.lineTo(size * 0.62, -size * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a2321";
    ctx.lineWidth = Math.max(1, size * 0.04);
    ctx.stroke();
    roundedRect(ctx, -size * 0.5, -size * 0.06, size, size * 0.66, size * 0.05);
    ctx.fillStyle = "#ffd9a8";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#4a281f";
    roundedRect(ctx, -size * 0.1, size * 0.18, size * 0.2, size * 0.42, size * 0.03);
    ctx.fill();
    ctx.fillStyle = "#fff1b9";
    for (const windowX of [-size * 0.28, size * 0.28]) {
      roundedRect(ctx, windowX - size * 0.1, size * 0.07, size * 0.2, size * 0.18, size * 0.03);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(windowX, size * 0.07);
      ctx.lineTo(windowX, size * 0.25);
      ctx.moveTo(windowX - size * 0.1, size * 0.16);
      ctx.lineTo(windowX + size * 0.1, size * 0.16);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBookPile(ctx, x, y, size) {
    const covers = ["#e84d5b", "#4e9dff", "#ffd44d", "#45cc76", "#b85cff"];
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < 5; i += 1) {
      ctx.save();
      ctx.translate((i - 2) * size * 0.13, size * 0.25 - i * size * 0.16);
      ctx.rotate((i - 2) * 0.12);
      drawBook(ctx, 0, 0, size * (0.62 + i * 0.03), covers[i]);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawBookwormSegment(ctx, x, y, size, isHead, index = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = "rgba(255, 216, 74, 0.45)";
    ctx.shadowBlur = 7;
    ctx.fillStyle = isHead ? "#ffd44d" : index % 2 === 0 ? "#6ee36d" : "#42c0a2";
    ctx.strokeStyle = isHead ? "#5c3c16" : "#12634d";
    ctx.lineWidth = Math.max(1, size * 0.12);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.48, size * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = Math.max(1, size * 0.05);
    ctx.beginPath();
    ctx.moveTo(-size * 0.32, -size * 0.1);
    ctx.lineTo(size * 0.32, -size * 0.1);
    ctx.moveTo(-size * 0.28, size * 0.08);
    ctx.lineTo(size * 0.26, size * 0.08);
    ctx.stroke();
    if (isHead) {
      ctx.fillStyle = "#1b2633";
      ctx.beginPath();
      ctx.arc(-size * 0.16, -size * 0.06, size * 0.055, 0, Math.PI * 2);
      ctx.arc(size * 0.16, -size * 0.06, size * 0.055, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#7d4d1c";
      ctx.lineWidth = Math.max(1, size * 0.06);
      ctx.beginPath();
      ctx.arc(0, size * 0.11, size * 0.16, 0, Math.PI);
      ctx.stroke();
      drawBook(ctx, 0, -size * 0.42, size * 0.46, "#e84d5b");
    }
    ctx.restore();
  }

  function drawDustDevil(ctx, x, y, size, spin = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    ctx.lineCap = "round";
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 244, 203, ${0.28 + i * 0.08})`;
      ctx.lineWidth = Math.max(2, size * (0.035 + i * 0.007));
      ctx.ellipse(0, size * (0.16 - i * 0.12), size * (0.14 + i * 0.12), size * 0.07, -0.22, 0, Math.PI * 1.72);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLooseBook(ctx, x, y, size, angle, cover) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    drawBook(ctx, 0, 0, size, cover);
    ctx.restore();
  }

  function drawAtlasSprite(ctx, image, sprite, x, y, width, height, rotation = 0) {
    if (!imageLoaded(image)) return false;
    const scale = Math.min(width / sprite.w, height / sprite.h);
    const drawWidth = sprite.w * scale;
    const drawHeight = sprite.h * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.drawImage(
      image,
      sprite.x,
      sprite.y,
      sprite.w,
      sprite.h,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight,
    );
    ctx.restore();
    return true;
  }

  function drawImageFit(ctx, image, x, y, width, height, rotation = 0) {
    if (!imageLoaded(image)) return false;
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
    return true;
  }

  function drawStarShape(ctx, x, y, outer, inner, points = 5) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i += 1) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + (i * Math.PI) / points;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function drawWesternPanel(ctx, x, y, width, height, radius = 18) {
    const wood = ctx.createLinearGradient(x, y, x, y + height);
    wood.addColorStop(0, "#a55d24");
    wood.addColorStop(0.45, "#6f3718");
    wood.addColorStop(1, "#4c2411");
    ctx.save();
    roundedRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = wood;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#d8943b";
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#3b1a0d";
    ctx.stroke();
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = "#e6a95a";
    ctx.lineWidth = 2;
    for (let lineY = y + 14; lineY < y + height - 8; lineY += 21) {
      ctx.beginPath();
      ctx.moveTo(x + 12, lineY + Math.sin(lineY) * 2);
      ctx.lineTo(x + width - 12, lineY + Math.cos(lineY) * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParchmentPanel(ctx, x, y, width, height, radius = 18) {
    const paper = ctx.createLinearGradient(x, y, x, y + height);
    paper.addColorStop(0, "#fff0c9");
    paper.addColorStop(0.52, "#f4d59b");
    paper.addColorStop(1, "#c98742");
    ctx.save();
    roundedRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = paper;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#8b461c";
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.62)";
    ctx.stroke();
    ctx.restore();
  }

  function pixelRect(ctx, x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
  }

  function drawPixelBookStack(ctx, x, y, scale = 1, variant = 0) {
    const colors = ["#e14232", "#5cc14d", "#3154c8", "#f0cf3e", "#c443b2", "#ebe4d2"];
    const books = [
      colors[(variant + 0) % colors.length],
      colors[(variant + 2) % colors.length],
      colors[(variant + 4) % colors.length],
      colors[(variant + 1) % colors.length],
    ];
    const unit = Math.max(1, scale);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    for (let i = 0; i < 4; i += 1) {
      const bookY = Math.round((4 - i) * 4 * unit);
      const bookX = Math.round((i % 2) * 1 * unit);
      const width = Math.round(17 * unit);
      const height = Math.round(4 * unit);
      pixelRect(ctx, bookX - width / 2 - unit, bookY - 11 * unit, width + 2 * unit, height + 2 * unit, "#050505");
      pixelRect(ctx, bookX - width / 2, bookY - 10 * unit, width, height, books[i]);
      pixelRect(ctx, bookX - width / 2 + 2 * unit, bookY - 6 * unit, width - 3 * unit, 2 * unit, "#fff4d1");
      pixelRect(ctx, bookX + width / 2 - 3 * unit, bookY - 10 * unit, 2 * unit, height, "#ffffff");
    }
    pixelRect(ctx, 9 * unit, -3 * unit, 2 * unit, 4 * unit, "#fff4d1");
    pixelRect(ctx, 11 * unit, -5 * unit, 2 * unit, 2 * unit, "#69f56f");
    ctx.restore();
  }

  function drawPixelBox(ctx, x, y, scale = 1) {
    const unit = Math.max(1, scale);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    pixelRect(ctx, -10 * unit, -8 * unit, 20 * unit, 16 * unit, "#050505");
    pixelRect(ctx, -8 * unit, -6 * unit, 16 * unit, 13 * unit, "#b97945");
    pixelRect(ctx, -8 * unit, -6 * unit, 16 * unit, 4 * unit, "#d09a5e");
    pixelRect(ctx, -1 * unit, -6 * unit, 2 * unit, 13 * unit, "#6f4228");
    pixelRect(ctx, -6 * unit, 3 * unit, 12 * unit, 2 * unit, "#815033");
    ctx.restore();
  }

  function drawPixelHousePlant(ctx, x, y, scale = 1) {
    const unit = Math.max(1, scale);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    pixelRect(ctx, -8 * unit, 2 * unit, 16 * unit, 10 * unit, "#050505");
    pixelRect(ctx, -6 * unit, 4 * unit, 12 * unit, 7 * unit, "#b97945");
    pixelRect(ctx, -4 * unit, 9 * unit, 8 * unit, 2 * unit, "#6f4228");
    pixelRect(ctx, -1 * unit, -7 * unit, 2 * unit, 12 * unit, "#46d074");
    pixelRect(ctx, -8 * unit, -7 * unit, 7 * unit, 4 * unit, "#46d074");
    pixelRect(ctx, 1 * unit, -10 * unit, 8 * unit, 4 * unit, "#46d074");
    pixelRect(ctx, -10 * unit, -2 * unit, 8 * unit, 4 * unit, "#2fa85a");
    pixelRect(ctx, 2 * unit, -3 * unit, 9 * unit, 4 * unit, "#2fa85a");
    pixelRect(ctx, -5 * unit, -12 * unit, 5 * unit, 4 * unit, "#69f56f");
    ctx.restore();
  }

  function drawPixelCouchHalf(ctx, x, y, scale = 1, side = "left") {
    const unit = Math.max(1, scale);
    const isLeft = side === "left";
    const outerArmX = isLeft ? -10 : 6;
    const seamX = isLeft ? 9 : -10;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    pixelRect(ctx, -10 * unit, -8 * unit, 20 * unit, 17 * unit, "#050505");
    pixelRect(ctx, -9 * unit, -6 * unit, 19 * unit, 13 * unit, "#7a54d6");
    pixelRect(ctx, -9 * unit, -6 * unit, 19 * unit, 4 * unit, "#9b76f0");
    pixelRect(ctx, -9 * unit, 2 * unit, 19 * unit, 5 * unit, "#50349c");
    pixelRect(ctx, seamX * unit, -6 * unit, 1 * unit, 13 * unit, "#7a54d6");
    pixelRect(ctx, outerArmX * unit, -10 * unit, 5 * unit, 18 * unit, "#050505");
    pixelRect(ctx, (outerArmX + 1) * unit, -7 * unit, 3 * unit, 13 * unit, "#b8865a");
    pixelRect(ctx, (isLeft ? -6 : 4) * unit, 8 * unit, 3 * unit, 3 * unit, "#b8865a");
    ctx.restore();
  }

  function drawPixelVerticalCouchHalf(ctx, x, y, scale = 1, part = "top") {
    const unit = Math.max(1, scale);
    const isTop = part === "top";
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (isTop) {
      pixelRect(ctx, -10 * unit, -10 * unit, 20 * unit, 3 * unit, "#050505");
      pixelRect(ctx, -10 * unit, -8 * unit, 4 * unit, 20 * unit, "#050505");
      pixelRect(ctx, 6 * unit, -8 * unit, 4 * unit, 20 * unit, "#050505");
      pixelRect(ctx, -7 * unit, -7 * unit, 14 * unit, 19 * unit, "#7a54d6");
      pixelRect(ctx, -7 * unit, -7 * unit, 14 * unit, 6 * unit, "#9b76f0");
      pixelRect(ctx, -6 * unit, 4 * unit, 12 * unit, 6 * unit, "#50349c");
      pixelRect(ctx, -9 * unit, -5 * unit, 3 * unit, 17 * unit, "#b8865a");
      pixelRect(ctx, 6 * unit, -5 * unit, 3 * unit, 17 * unit, "#b8865a");
      pixelRect(ctx, -5 * unit, -2 * unit, 10 * unit, 1 * unit, "#c8a3ff");
    } else {
      pixelRect(ctx, -10 * unit, -12 * unit, 4 * unit, 20 * unit, "#050505");
      pixelRect(ctx, 6 * unit, -12 * unit, 4 * unit, 20 * unit, "#050505");
      pixelRect(ctx, -10 * unit, 7 * unit, 20 * unit, 3 * unit, "#050505");
      pixelRect(ctx, -7 * unit, -12 * unit, 14 * unit, 18 * unit, "#7a54d6");
      pixelRect(ctx, -7 * unit, -9 * unit, 14 * unit, 5 * unit, "#9b76f0");
      pixelRect(ctx, -6 * unit, 0, 12 * unit, 6 * unit, "#50349c");
      pixelRect(ctx, -9 * unit, -12 * unit, 3 * unit, 18 * unit, "#b8865a");
      pixelRect(ctx, 6 * unit, -12 * unit, 3 * unit, 18 * unit, "#b8865a");
      pixelRect(ctx, -7 * unit, 8 * unit, 3 * unit, 3 * unit, "#b8865a");
      pixelRect(ctx, 4 * unit, 8 * unit, 3 * unit, 3 * unit, "#b8865a");
    }
    ctx.restore();
  }

  function drawPixelSideTable(ctx, x, y, scale = 1) {
    const unit = Math.max(1, scale);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    pixelRect(ctx, -9 * unit, -8 * unit, 18 * unit, 16 * unit, "#050505");
    pixelRect(ctx, -7 * unit, -6 * unit, 14 * unit, 13 * unit, "#8f5a32");
    pixelRect(ctx, -8 * unit, -8 * unit, 16 * unit, 4 * unit, "#c08045");
    pixelRect(ctx, -5 * unit, -1 * unit, 10 * unit, 2 * unit, "#050505");
    pixelRect(ctx, -4 * unit, 3 * unit, 8 * unit, 2 * unit, "#050505");
    pixelRect(ctx, -1 * unit, -2 * unit, 2 * unit, 2 * unit, "#f0cf3e");
    ctx.restore();
  }

  function drawPixelClothesPile(ctx, x, y, scale = 1) {
    const unit = Math.max(1, scale);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    pixelRect(ctx, -11 * unit, 1 * unit, 22 * unit, 10 * unit, "#050505");
    pixelRect(ctx, -9 * unit, 3 * unit, 9 * unit, 6 * unit, "#5aa4ff");
    pixelRect(ctx, -1 * unit, -2 * unit, 11 * unit, 10 * unit, "#ff5fc3");
    pixelRect(ctx, -5 * unit, -5 * unit, 9 * unit, 6 * unit, "#f4df32");
    pixelRect(ctx, 4 * unit, 4 * unit, 7 * unit, 5 * unit, "#f8f8ef");
    pixelRect(ctx, -8 * unit, 6 * unit, 14 * unit, 2 * unit, "#50349c");
    ctx.restore();
  }

  function drawPixelTennisBall(ctx, x, y, scale = 1) {
    const unit = Math.max(1, scale);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    pixelRect(ctx, -5 * unit, -5 * unit, 10 * unit, 10 * unit, "#050505");
    pixelRect(ctx, -3 * unit, -6 * unit, 6 * unit, 12 * unit, "#050505");
    pixelRect(ctx, -6 * unit, -3 * unit, 12 * unit, 6 * unit, "#050505");
    pixelRect(ctx, -4 * unit, -4 * unit, 8 * unit, 8 * unit, "#f4df32");
    pixelRect(ctx, -2 * unit, -5 * unit, 4 * unit, 10 * unit, "#f4df32");
    pixelRect(ctx, -5 * unit, -2 * unit, 10 * unit, 4 * unit, "#f4df32");
    pixelRect(ctx, -3 * unit, -4 * unit, 2 * unit, 8 * unit, "#fff6a3");
    pixelRect(ctx, 2 * unit, -3 * unit, 1 * unit, 7 * unit, "#8fe35b");
    pixelRect(ctx, 1 * unit, -5 * unit, 2 * unit, 2 * unit, "#fff6a3");
    ctx.restore();
  }

  function drawPixelSpider(ctx, x, y, scale = 1) {
    const unit = Math.max(1, scale);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    pixelRect(ctx, -10 * unit, -7 * unit, 20 * unit, 14 * unit, "#050505");
    pixelRect(ctx, -7 * unit, -5 * unit, 14 * unit, 10 * unit, "#ff2aa6");
    pixelRect(ctx, -4 * unit, -3 * unit, 8 * unit, 6 * unit, "#b85cff");
    pixelRect(ctx, -5 * unit, -2 * unit, 3 * unit, 3 * unit, "#f8f8ef");
    pixelRect(ctx, 3 * unit, -2 * unit, 3 * unit, 3 * unit, "#f8f8ef");
    pixelRect(ctx, -4 * unit, -1 * unit, 1 * unit, 1 * unit, "#050505");
    pixelRect(ctx, 4 * unit, -1 * unit, 1 * unit, 1 * unit, "#050505");
    for (const legY of [-5, -1, 3]) {
      pixelRect(ctx, -14 * unit, legY * unit, 6 * unit, 2 * unit, "#f0cf3e");
      pixelRect(ctx, 8 * unit, legY * unit, 6 * unit, 2 * unit, "#f0cf3e");
    }
    pixelRect(ctx, -16 * unit, -7 * unit, 3 * unit, 2 * unit, "#f0cf3e");
    pixelRect(ctx, 13 * unit, -7 * unit, 3 * unit, 2 * unit, "#f0cf3e");
    pixelRect(ctx, -16 * unit, 5 * unit, 3 * unit, 2 * unit, "#f0cf3e");
    pixelRect(ctx, 13 * unit, 5 * unit, 3 * unit, 2 * unit, "#f0cf3e");
    ctx.restore();
  }

  function drawPixelBookwormSegment(ctx, x, y, scale = 1, isHead = false, index = 0, part = "bookStack") {
    const unit = Math.max(1, scale);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (isHead) {
      pixelRect(ctx, -9 * unit, -8 * unit, 18 * unit, 17 * unit, "#050505");
      pixelRect(ctx, -7 * unit, -7 * unit, 14 * unit, 13 * unit, "#67c54d");
      pixelRect(ctx, -5 * unit, -3 * unit, 4 * unit, 4 * unit, "#f7fbff");
      pixelRect(ctx, 3 * unit, -3 * unit, 4 * unit, 4 * unit, "#f7fbff");
      pixelRect(ctx, -4 * unit, -2 * unit, 2 * unit, 2 * unit, "#050505");
      pixelRect(ctx, 4 * unit, -2 * unit, 2 * unit, 2 * unit, "#050505");
      pixelRect(ctx, -3 * unit, 5 * unit, 7 * unit, 2 * unit, "#050505");
      pixelRect(ctx, -2 * unit, 7 * unit, 4 * unit, 2 * unit, "#ff5fc3");
      pixelRect(ctx, -6 * unit, -11 * unit, 2 * unit, 5 * unit, "#f5df2f");
      pixelRect(ctx, 6 * unit, -11 * unit, 2 * unit, 5 * unit, "#f5df2f");
      pixelRect(ctx, -8 * unit, -13 * unit, 2 * unit, 2 * unit, "#f5df2f");
      pixelRect(ctx, 8 * unit, -13 * unit, 2 * unit, 2 * unit, "#f5df2f");
    } else {
      if (part === "box") {
        drawPixelBox(ctx, 0, 0, unit);
      } else {
        drawPixelBookStack(ctx, 0, 1 * unit, unit, index);
      }
    }
    ctx.restore();
  }

  function drawPixelAussie(ctx, x, y, scale = 1) {
    const unit = Math.max(1, scale);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    pixelRect(ctx, -8 * unit, -22 * unit, 16 * unit, 22 * unit, "#050505");
    pixelRect(ctx, -6 * unit, -20 * unit, 12 * unit, 19 * unit, "#f8f8ef");
    pixelRect(ctx, -10 * unit, -14 * unit, 4 * unit, 12 * unit, "#f8f8ef");
    pixelRect(ctx, 6 * unit, -14 * unit, 4 * unit, 12 * unit, "#f8f8ef");
    pixelRect(ctx, -8 * unit, -4 * unit, 4 * unit, 10 * unit, "#f8f8ef");
    pixelRect(ctx, 4 * unit, -4 * unit, 4 * unit, 10 * unit, "#f8f8ef");
    pixelRect(ctx, -6 * unit, 6 * unit, 3 * unit, 3 * unit, "#050505");
    pixelRect(ctx, 5 * unit, 6 * unit, 3 * unit, 3 * unit, "#050505");
    pixelRect(ctx, -7 * unit, -31 * unit, 14 * unit, 12 * unit, "#050505");
    pixelRect(ctx, -5 * unit, -29 * unit, 10 * unit, 9 * unit, "#f8f8ef");
    pixelRect(ctx, -9 * unit, -30 * unit, 4 * unit, 7 * unit, "#caa170");
    pixelRect(ctx, 5 * unit, -30 * unit, 4 * unit, 7 * unit, "#f8f8ef");
    pixelRect(ctx, -3 * unit, -25 * unit, 2 * unit, 2 * unit, "#050505");
    pixelRect(ctx, 3 * unit, -25 * unit, 2 * unit, 2 * unit, "#050505");
    pixelRect(ctx, -1 * unit, -22 * unit, 2 * unit, 2 * unit, "#050505");
    pixelRect(ctx, 8 * unit, -9 * unit, 5 * unit, 2 * unit, "#f8f8ef");
    pixelRect(ctx, 13 * unit, -11 * unit, 2 * unit, 2 * unit, "#050505");
    ctx.restore();
  }

  function drawPixelLivingRoomIcon(ctx, x, y, scale = 1) {
    const unit = Math.max(1, scale);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    pixelRect(ctx, -25 * unit, -24 * unit, 50 * unit, 30 * unit, "#050505");
    pixelRect(ctx, -23 * unit, -22 * unit, 48 * unit, 28 * unit, "#d1815a");
    pixelRect(ctx, -20 * unit, -19 * unit, 20 * unit, 14 * unit, "#0b0b16");
    pixelRect(ctx, 2 * unit, -19 * unit, 20 * unit, 14 * unit, "#0b0b16");
    pixelRect(ctx, -10 * unit, -13 * unit, 2 * unit, 2 * unit, "#ffe75f");
    pixelRect(ctx, 10 * unit, -16 * unit, 2 * unit, 2 * unit, "#ffe75f");
    pixelRect(ctx, 17 * unit, -12 * unit, 2 * unit, 2 * unit, "#ffe75f");
    pixelRect(ctx, -17 * unit, -2 * unit, 44 * unit, 21 * unit, "#050505");
    pixelRect(ctx, -13 * unit, 0, 36 * unit, 16 * unit, "#b97945");
    pixelRect(ctx, -10 * unit, -3 * unit, 12 * unit, 8 * unit, "#f4ead8");
    pixelRect(ctx, -9 * unit, 6 * unit, 31 * unit, 10 * unit, "#7551db");
    pixelRect(ctx, -17 * unit, 15 * unit, 4 * unit, 12 * unit, "#b97945");
    pixelRect(ctx, 23 * unit, 15 * unit, 4 * unit, 12 * unit, "#b97945");
    pixelRect(ctx, 31 * unit, 1 * unit, 13 * unit, 22 * unit, "#050505");
    pixelRect(ctx, 33 * unit, 3 * unit, 9 * unit, 18 * unit, "#c08045");
    pixelRect(ctx, 34 * unit, -10 * unit, 7 * unit, 10 * unit, "#f4e77b");
    pixelRect(ctx, 36 * unit, 0, 2 * unit, 21 * unit, "#c08045");
    ctx.restore();
  }

  function drawBookwormMenuPreview() {
    if (!bookwormMenuCanvas) return;
    const ctx = bookwormMenuCanvas.getContext("2d");
    const { width, height } = bookwormMenuCanvas;
    const fieldWidth = 380;
    const panelX = fieldWidth + 10;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#020202";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#ff2aa6";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, width - 4, height - 4);
    ctx.beginPath();
    ctx.moveTo(panelX, 2);
    ctx.lineTo(panelX, height - 2);
    ctx.stroke();

    for (let dotY = 82; dotY < height - 56; dotY += 32) {
      for (let dotX = 26; dotX < fieldWidth - 14; dotX += 29) {
        pixelRect(ctx, dotX, dotY, 2, 2, "#00f060");
      }
    }

    const props = [
      ["book", 62, 126, 1.45, 1],
      ["plant", 174, 132, 1.35],
      ["box", 306, 118, 1.35],
      ["clothes", 116, 238, 1.35],
      ["table", 262, 242, 1.35],
      ["book", 334, 310, 1.45, 4],
      ["box", 82, 370, 1.45],
      ["plant", 214, 398, 1.45],
      ["clothes", 316, 466, 1.35],
      ["book", 154, 520, 1.5, 8],
      ["table", 70, 574, 1.35],
    ];

    for (const [kind, x, y, scale, variant = 0] of props) {
      if (kind === "book") drawPixelBookStack(ctx, x, y, scale, variant);
      if (kind === "box") drawPixelBox(ctx, x, y, scale);
      if (kind === "plant") drawPixelHousePlant(ctx, x, y, scale);
      if (kind === "clothes") drawPixelClothesPile(ctx, x, y, scale);
      if (kind === "table") drawPixelSideTable(ctx, x, y, scale);
    }

    drawPixelCouchHalf(ctx, 214, 316, 1.45, "left");
    drawPixelCouchHalf(ctx, 242, 316, 1.45, "right");
    drawPixelVerticalCouchHalf(ctx, 332, 586, 1.25, "top");
    drawPixelVerticalCouchHalf(ctx, 332, 616, 1.25, "bottom");

    drawPixelBookwormSegment(ctx, 92, 92, 1.2, true);
    drawPixelBookwormSegment(ctx, 124, 94, 1.2, false, 1, "bookStack");
    drawPixelBookwormSegment(ctx, 156, 96, 1.2, false, 2, "box");

    ctx.fillStyle = "#00f060";
    ctx.font = "700 17px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.fillText("HIGH SCORE", fieldWidth / 2 + 20, 24);
    ctx.fillText(String(readStoredNumber(bookwormHighScoreKey, 0)).padStart(6, "0"), fieldWidth / 2 + 20, 48);
    ctx.fillText("WAVE", panelX + 45, 58);
    ctx.fillText("01", panelX + 45, 82);
    ctx.fillText("LIVES", panelX + 45, 150);
    drawPixelAussie(ctx, panelX + 44, 198, 0.62);
    drawPixelAussie(ctx, panelX + 44, 246, 0.62);
    drawPixelAussie(ctx, panelX + 44, 294, 0.62);

    ctx.fillStyle = "#ff2aa6";
    ctx.font = "700 15px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("DEFEND", panelX + 44, 520);
    ctx.fillText("THE", panelX + 44, 544);
    ctx.fillText("BEDROOM!", panelX + 44, 568);
    drawPixelLivingRoomIcon(ctx, panelX + 43, height - 45, 0.72);

    drawPixelAussie(ctx, 250, 650, 3.25);
    drawPixelTennisBall(ctx, 318, 632, 1.6);
    ctx.restore();
  }

  const centipede = {
    canvas: document.querySelector("#centipedeCanvas"),
    ctx: document.querySelector("#centipedeCanvas").getContext("2d"),
    cols: 19,
    rows: 36,
    cell: 20,
    score: 0,
    highScore: readStoredNumber(bookwormHighScoreKey, 0),
    lives: 3,
    wave: 1,
    dir: 1,
    segmentLimit: 14,
    stepTimer: 0,
    stepEvery: 0.13,
    fireTimer: 0,
    fireCooldown: 0.23,
    maxShots: 3,
    state: "intro",
    messageTimer: 0,
    obstacles: new Map(),
    segments: [],
    bullets: [],
    isFiring: false,
    spider: null,
    spiderTimer: 4,
    player: { x: 190, y: 656, targetX: 190, targetY: 656 },

    reset() {
      this.highScore = readStoredNumber(bookwormHighScoreKey, 0);
      this.score = 0;
      this.lives = 3;
      this.wave = 1;
      this.stepEvery = 0.13;
      this.fireTimer = 0;
      this.isFiring = false;
      this.spider = null;
      this.spiderTimer = 1.1 + Math.random() * 1.1;
      this.messageTimer = 0;
      this.state = "intro";
      this.bullets = [];
      this.player = { x: 190, y: 656, targetX: 190, targetY: 656 };
      this.makeObstacles();
      this.spawnBookworm();
      this.draw();
    },

    introButton() {
      return {
        x: 172,
        y: 442,
        w: 136,
        h: 46,
      };
    },

    isIntroButtonEvent(event) {
      const point = canvasPoint(this.canvas, event);
      const button = this.introButton();
      return (
        point.x >= button.x &&
        point.x <= button.x + button.w &&
        point.y >= button.y &&
        point.y <= button.y + button.h
      );
    },

    startFirstWave() {
      if (this.state !== "intro") return false;
      this.state = "playing";
      this.messageTimer = 1.5;
      this.stepTimer = 0;
      this.draw();
      return true;
    },

    updateHighScore() {
      if (this.score <= this.highScore) return;
      this.highScore = this.score;
      writeStoredNumber(bookwormHighScoreKey, this.highScore);
    },

    isReservedObstacleCell(col, row) {
      return col < 0 || col >= this.cols || row < 4 || row >= this.rows - 2 || (row > this.rows - 8 && col > 5 && col < 14);
    },

    tryAddObstacle(col, row, type, hp = 2) {
      const key = cellKey(col, row);
      if (this.isReservedObstacleCell(col, row) || this.obstacles.has(key)) return false;
      this.obstacles.set(key, { col, row, hp, maxHp: hp, type });
      return true;
    },

    tryAddCouch(col, row) {
      const leftKey = cellKey(col, row);
      const rightKey = cellKey(col + 1, row);
      if (
        this.isReservedObstacleCell(col, row) ||
        this.isReservedObstacleCell(col + 1, row) ||
        this.obstacles.has(leftKey) ||
        this.obstacles.has(rightKey)
      ) {
        return false;
      }
      this.obstacles.set(leftKey, { col, row, hp: 1, maxHp: 1, type: "couchLeft" });
      this.obstacles.set(rightKey, { col: col + 1, row, hp: 1, maxHp: 1, type: "couchRight" });
      return true;
    },

    tryAddVerticalCouch(col, row) {
      const topKey = cellKey(col, row);
      const bottomKey = cellKey(col, row + 1);
      if (
        this.isReservedObstacleCell(col, row) ||
        this.isReservedObstacleCell(col, row + 1) ||
        this.obstacles.has(topKey) ||
        this.obstacles.has(bottomKey)
      ) {
        return false;
      }
      this.obstacles.set(topKey, { col, row, hp: 1, maxHp: 1, type: "couchTop" });
      this.obstacles.set(bottomKey, { col, row: row + 1, hp: 1, maxHp: 1, type: "couchBottom" });
      return true;
    },

    randomObstacleType() {
      const types = [
        "bookStack",
        "bookStack",
        "bookStack",
        "bookStack",
        "box",
        "box",
        "plant",
        "sideTable",
        "clothes",
      ];
      return types[randInt(types.length)];
    },

    randomBookwormPart() {
      return Math.random() < 0.34 ? "box" : "bookStack";
    },

    makeObstacles(extra = 0) {
      const target = 28 + Math.min(14, this.wave * 2) + extra;
      this.obstacles.clear();
      let couches = 0;
      let couchGuard = 0;
      while (couches < 2 && couchGuard < 120) {
        couchGuard += 1;
        const vertical = couches === 1 || Math.random() < 0.5;
        const col = vertical ? randInt(this.cols) : randInt(this.cols - 1);
        const row = 6 + randInt(this.rows - 13);
        if (vertical ? this.tryAddVerticalCouch(col, row) : this.tryAddCouch(col, row)) couches += 1;
      }
      let guard = 0;
      while (this.obstacles.size < target && guard < 1000) {
        guard += 1;
        const col = randInt(this.cols);
        const row = 5 + randInt(this.rows - 11);
        if (Math.random() < 0.08) {
          const vertical = Math.random() < 0.5;
          const placed = vertical
            ? this.tryAddVerticalCouch(col, row)
            : this.tryAddCouch(Math.min(col, this.cols - 2), row);
          if (placed) continue;
        }
        this.tryAddObstacle(col, row, this.randomObstacleType());
      }
    },

    addObstacles(count) {
      let added = 0;
      let guard = 0;
      while (added < count && guard < 400) {
        guard += 1;
        const col = randInt(this.cols);
        const row = 5 + randInt(this.rows - 12);
        if (Math.random() < 0.12) {
          const vertical = Math.random() < 0.5;
          const placed = vertical
            ? this.tryAddVerticalCouch(col, row)
            : this.tryAddCouch(Math.min(col, this.cols - 2), row);
          if (placed) added += 2;
          continue;
        }
        if (this.tryAddObstacle(col, row, this.randomObstacleType())) added += 1;
      }
    },

    spawnBookworm() {
      this.dir = 1;
      this.stepTimer = 0;
      const length = clamp(11 + this.wave, 12, 16);
      this.segments = Array.from({ length }, (_, index) => ({
        col: length - index,
        row: 7,
        part: index === 0 ? "bookStack" : this.randomBookwormPart(),
      }));
      this.segmentLimit = this.segments.length;
    },

    updatePointer(event) {
      const point = canvasPoint(this.canvas, event);
      this.player.targetX = clamp(point.x, 24, this.cols * this.cell - 24);
      this.player.targetY = clamp(point.y, this.canvas.height * 0.66, this.canvas.height - 28);
    },

    fire() {
      if (this.state === "intro") {
        return;
      }
      if (this.state !== "playing") {
        this.reset();
        return;
      }
      if (this.fireTimer > 0) return;
      this.bullets = this.bullets.filter((bullet) => bullet.y > -20);
      if (this.bullets.length >= this.maxShots) return;
      this.bullets.push({ x: this.player.x, y: this.player.y - 21 });
      this.fireTimer = this.fireCooldown;
    },

    update(dt) {
      if (this.state !== "playing") {
        this.draw();
        return;
      }

      this.messageTimer = Math.max(0, this.messageTimer - dt);
      this.fireTimer = Math.max(0, this.fireTimer - dt);
      if (this.isFiring) {
        this.fire();
      }
      this.player.x += (this.player.targetX - this.player.x) * Math.min(1, dt * 18);
      this.player.y += (this.player.targetY - this.player.y) * Math.min(1, dt * 18);

      for (const bullet of this.bullets) {
        bullet.y -= 610 * dt;
      }
      this.bullets = this.bullets.filter((bullet) => bullet.y > -20);

      if (this.messageTimer <= 0) {
        this.stepTimer += dt;
        while (this.stepTimer >= this.stepEvery && this.messageTimer <= 0) {
          this.stepTimer -= this.stepEvery;
          this.advanceBookworm();
        }

        if (this.messageTimer <= 0) {
          this.updateSpider(dt);
          this.resolveBulletHits();
          this.resolvePlayerHits();
        }
      }
      this.draw();
    },

    spawnSpider() {
      const fieldWidth = this.cols * this.cell;
      if (Math.random() < 0.35) {
        const targetSide = Math.random() < 0.5 ? -1 : 1;
        this.spider = {
          x: fieldWidth * (0.18 + Math.random() * 0.64),
          y: 58,
          vx: targetSide * (82 + Math.random() * 82),
          vy: 170 + Math.random() * 90,
          mode: "drop",
          changeTimer: 0.12 + Math.random() * 0.2,
        };
        return;
      }

      const spawnSide = Math.random() < 0.5 ? -1 : 1;
      this.spider = {
        x: spawnSide < 0 ? -18 : fieldWidth + 18,
        y: this.canvas.height * (0.46 + Math.random() * 0.38),
        vx: -spawnSide * (138 + Math.random() * 78),
        vy: (Math.random() < 0.5 ? -1 : 1) * (125 + Math.random() * 115),
        mode: "side",
        changeTimer: 0.12 + Math.random() * 0.2,
      };
    },

    updateSpider(dt) {
      if (!this.spider) {
        this.spiderTimer -= dt;
        if (this.spiderTimer <= 0) {
          this.spawnSpider();
          this.spiderTimer = 3.8 + Math.random() * 3.2;
        }
        return;
      }

      const fieldWidth = this.cols * this.cell;
      const minY = this.canvas.height * 0.38;
      const maxY = this.canvas.height - 52;
      this.spider.changeTimer -= dt;
      if (this.spider.changeTimer <= 0) {
        this.spider.changeTimer = 0.1 + Math.random() * 0.24;
        if (this.spider.mode === "drop") {
          this.spider.vx += (Math.random() - 0.5) * 170;
          this.spider.vx = clamp(this.spider.vx, -230, 230);
          this.spider.vy = 155 + Math.random() * 135;
        } else {
          if (Math.random() < 0.84) this.spider.vy *= -1;
          this.spider.vy += (Math.random() - 0.5) * 180;
          this.spider.vy = clamp(this.spider.vy, -260, 260);
        }
      }

      this.spider.x += this.spider.vx * dt;
      this.spider.y += this.spider.vy * dt;
      if (this.spider.y < minY) {
        this.spider.y = minY;
        this.spider.vy = Math.abs(this.spider.vy);
      }
      if (this.spider.y > maxY && this.spider.mode !== "drop") {
        this.spider.y = maxY;
        this.spider.vy = -Math.abs(this.spider.vy);
      }

      const col = Math.floor(this.spider.x / this.cell);
      const row = Math.floor(this.spider.y / this.cell);
      for (const offsetRow of [0, -1, 1]) {
        const key = cellKey(col, row + offsetRow);
        if (this.obstacles.has(key)) {
          this.obstacles.delete(key);
          this.score += 2;
        }
      }

      if (
        (this.spider.vx > 0 && this.spider.x > fieldWidth + 34) ||
        (this.spider.vx < 0 && this.spider.x < -34) ||
        (this.spider.mode === "drop" && this.spider.y > this.canvas.height + 34)
      ) {
        this.spider = null;
      }
    },

    advanceBookworm() {
      if (!this.segments.length) {
        this.score += 850 + this.wave * 150;
        this.wave += 1;
        this.stepEvery = Math.max(0.07, this.stepEvery - 0.008);
        this.addObstacles(8);
        this.spawnBookworm();
        this.messageTimer = 1.2;
        return;
      }

      const head = this.segments[0];
      let nextCol = head.col + this.dir;
      let nextRow = head.row;
      const blocked =
        nextCol < 0 ||
        nextCol >= this.cols ||
        this.obstacles.has(cellKey(nextCol, nextRow));

      if (blocked) {
        this.dir *= -1;
        nextCol = clamp(head.col + this.dir, 0, this.cols - 1);
        nextRow = head.row + 1;
      }

      if (nextRow >= this.rows - 2) {
        this.loseLife();
        return;
      }

      const previousPositions = this.segments.map((segment) => ({
        col: segment.col,
        row: segment.row,
      }));
      this.segments[0].col = nextCol;
      this.segments[0].row = nextRow;
      for (let i = 1; i < this.segments.length; i += 1) {
        this.segments[i].col = previousPositions[i - 1].col;
        this.segments[i].row = previousPositions[i - 1].row;
      }
    },

    loseLife() {
      this.lives -= 1;
      this.bullets = [];
      this.isFiring = false;
      this.spider = null;
      this.spiderTimer = 2.5 + Math.random() * 2.5;
      this.player.x = 190;
      this.player.y = 656;
      this.player.targetX = 190;
      this.player.targetY = 656;
      if (this.lives <= 0) {
        this.updateHighScore();
        this.state = "gameover";
        return;
      }
      this.spawnBookworm();
      this.messageTimer = 1.2;
    },

    resolveBulletHits() {
      const spentBullets = new Set();
      const spentSegments = new Set();

      this.bullets.forEach((bullet, bulletIndex) => {
        if (this.spider && Math.hypot(bullet.x - this.spider.x, bullet.y - this.spider.y) < 18) {
          spentBullets.add(bulletIndex);
          this.score += 900;
          this.spider = null;
          this.spiderTimer = 3.5 + Math.random() * 3.5;
          return;
        }

        for (const [index, segment] of this.segments.entries()) {
          const centerX = segment.col * this.cell + this.cell / 2;
          const centerY = segment.row * this.cell + this.cell / 2;
          if (Math.hypot(bullet.x - centerX, bullet.y - centerY) < 14) {
            spentBullets.add(bulletIndex);
            spentSegments.add(index);
            this.score += index === 0 ? 125 : 60;
            this.obstacles.set(cellKey(segment.col, segment.row), {
              col: segment.col,
              row: segment.row,
              hp: 1,
              type: segment.part === "box" ? "box" : "bookStack",
            });
            break;
          }
        }

        if (spentBullets.has(bulletIndex)) return;

        for (const obstacle of this.obstacles.values()) {
          const centerX = obstacle.col * this.cell + this.cell / 2;
          const centerY = obstacle.row * this.cell + this.cell / 2;
          if (Math.hypot(bullet.x - centerX, bullet.y - centerY) < 13) {
            obstacle.hp -= 1;
            spentBullets.add(bulletIndex);
            if (obstacle.hp <= 0) {
              this.obstacles.delete(cellKey(obstacle.col, obstacle.row));
              this.score += 10;
            }
            break;
          }
        }
      });

      this.bullets = this.bullets.filter((_, index) => !spentBullets.has(index));
      this.segments = this.segments.filter((_, index) => !spentSegments.has(index));
      if (spentSegments.size) {
        this.segmentLimit = this.segments.length;
      }
    },

    resolvePlayerHits() {
      for (const segment of this.segments) {
        const centerX = segment.col * this.cell + this.cell / 2;
        const centerY = segment.row * this.cell + this.cell / 2;
        if (Math.hypot(this.player.x - centerX, this.player.y - centerY) < 23) {
          this.loseLife();
          return;
        }
      }
      if (this.spider && Math.hypot(this.player.x - this.spider.x, this.player.y - this.spider.y) < 28) {
        this.loseLife();
      }
    },

    drawObstacle(obstacle) {
      const { ctx, cell } = this;
      const x = obstacle.col * cell + cell / 2;
      const y = obstacle.row * cell + cell / 2;
      ctx.save();
      ctx.globalAlpha = obstacle.hp >= (obstacle.maxHp ?? 2) ? 1 : 0.62;
      if (obstacle.type === "box") {
        drawPixelBox(ctx, x, y, 1);
      } else if (obstacle.type === "plant") {
        drawPixelHousePlant(ctx, x, y, 1);
      } else if (obstacle.type === "couchLeft") {
        drawPixelCouchHalf(ctx, x, y, 1, "left");
      } else if (obstacle.type === "couchRight") {
        drawPixelCouchHalf(ctx, x, y, 1, "right");
      } else if (obstacle.type === "couchTop") {
        drawPixelVerticalCouchHalf(ctx, x, y, 1, "top");
      } else if (obstacle.type === "couchBottom") {
        drawPixelVerticalCouchHalf(ctx, x, y, 1, "bottom");
      } else if (obstacle.type === "sideTable") {
        drawPixelSideTable(ctx, x, y, 1);
      } else if (obstacle.type === "clothes") {
        drawPixelClothesPile(ctx, x, y, 1);
      } else {
        drawPixelBookStack(ctx, x, y + 1, 1, obstacle.col + obstacle.row);
      }
      ctx.restore();
    },

    drawSegment(segment, index) {
      const { ctx, cell } = this;
      const centerX = segment.col * cell + cell / 2;
      const centerY = segment.row * cell + cell / 2;
      drawPixelBookwormSegment(ctx, centerX, centerY, 1, index === 0, index, segment.part);
    },

    drawBackground() {
      const { ctx, canvas } = this;
      ctx.imageSmoothingEnabled = false;
      const fieldWidth = this.cols * this.cell;
      const panelX = fieldWidth + 10;
      ctx.fillStyle = "#020202";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.strokeStyle = "#ff2aa6";
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
      ctx.beginPath();
      ctx.moveTo(panelX, 2);
      ctx.lineTo(panelX, canvas.height - 2);
      ctx.stroke();

      for (let dotY = 82; dotY < canvas.height - 56; dotY += 32) {
        for (let dotX = 26; dotX < fieldWidth - 14; dotX += 29) {
          pixelRect(ctx, dotX, dotY, 2, 2, "#00f060");
        }
      }

      pixelRect(ctx, panelX + 1, 2, canvas.width - panelX - 3, canvas.height - 4, "#020202");
      ctx.restore();
    },

    drawHud() {
      const { ctx, canvas } = this;
      const fieldWidth = this.cols * this.cell;
      const panelX = fieldWidth + 10;
      this.updateHighScore();
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      pixelRect(ctx, 3, 3, fieldWidth + 6, 58, "#020202");
      pixelRect(ctx, panelX + 1, 3, canvas.width - panelX - 4, canvas.height - 6, "#020202");
      ctx.strokeStyle = "#ff2aa6";
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
      ctx.beginPath();
      ctx.moveTo(panelX, 2);
      ctx.lineTo(panelX, canvas.height - 2);
      ctx.stroke();

      ctx.fillStyle = "#00f060";
      ctx.font = "700 17px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(this.score).padStart(6, "0"), 56, 38);
      ctx.fillText("HIGH SCORE", fieldWidth / 2 + 20, 24);
      ctx.fillText(String(this.highScore).padStart(6, "0"), fieldWidth / 2 + 20, 48);

      ctx.fillText("WAVE", panelX + 45, 58);
      ctx.fillText(String(this.wave).padStart(2, "0"), panelX + 45, 82);
      ctx.fillText("LIVES", panelX + 45, 150);
      for (let i = 0; i < this.lives; i += 1) {
        drawPixelAussie(ctx, panelX + 44, 198 + i * 48, 0.62);
      }

      ctx.fillStyle = "#ff2aa6";
      ctx.font = "700 15px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText("DEFEND", panelX + 44, 520);
      ctx.fillText("THE", panelX + 44, 544);
      ctx.fillText("BEDROOM!", panelX + 44, 568);
      drawPixelLivingRoomIcon(ctx, panelX + 43, canvas.height - 45, 0.72);
      ctx.restore();
    },

    drawOverlay(title, subtitle) {
      const { ctx, canvas } = this;
      this.updateHighScore();
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.78)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#ff2aa6";
      ctx.lineWidth = 2;
      ctx.strokeRect(84, canvas.height / 2 - 78, 312, 138);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ff2aa6";
      ctx.font = "700 24px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 36);
      ctx.fillStyle = "#00f060";
      ctx.font = "700 16px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(`SCORE ${String(this.score).padStart(6, "0")}`, canvas.width / 2, canvas.height / 2 - 6);
      ctx.fillText(`HIGH ${String(this.highScore).padStart(6, "0")}`, canvas.width / 2, canvas.height / 2 + 18);
      ctx.fillStyle = "#f0cf3e";
      ctx.font = "700 15px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 44);
      ctx.restore();
    },

    drawIntroOverlay() {
      const { ctx, canvas } = this;
      const button = this.introButton();
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.82)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      pixelRect(ctx, 46, 196, 388, 326, "#020202");
      ctx.strokeStyle = "#ff2aa6";
      ctx.lineWidth = 2;
      ctx.strokeRect(48, 198, 384, 322);
      ctx.textAlign = "center";
      ctx.fillStyle = "#00f060";
      ctx.font = "700 18px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText("BOOKWORM WATCH", canvas.width / 2, 234);
      ctx.fillStyle = "#f0cf3e";
      ctx.font = "700 15px ui-monospace, SFMono-Regular, Menlo, monospace";
      const lines = [
        "Oh no! The books have come",
        "alive while your parents are",
        "away!! Dutifully prevent them",
        "from encroaching on the",
        "bedroom!",
      ];
      for (let i = 0; i < lines.length; i += 1) {
        ctx.fillText(lines[i], canvas.width / 2, 278 + i * 26);
      }

      pixelRect(ctx, button.x, button.y, button.w, button.h, "#050505");
      ctx.fillStyle = "#00f060";
      ctx.fillRect(button.x + 3, button.y + 3, button.w - 6, button.h - 6);
      ctx.strokeStyle = "#f0cf3e";
      ctx.lineWidth = 2;
      ctx.strokeRect(button.x + 3, button.y + 3, button.w - 6, button.h - 6);
      ctx.fillStyle = "#020202";
      ctx.font = "700 17px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText("PLAY", button.x + button.w / 2, button.y + 29);
      ctx.restore();
    },

    draw() {
      const { ctx } = this;
      this.drawBackground();

      for (const obstacle of this.obstacles.values()) {
        this.drawObstacle(obstacle);
      }

      this.segments.forEach((segment, index) => this.drawSegment(segment, index));

      if (this.spider) {
        drawPixelSpider(ctx, this.spider.x, this.spider.y, 1.15);
      }

      for (const bullet of this.bullets) {
        drawPixelTennisBall(ctx, bullet.x, bullet.y, 1);
      }

      drawPixelAussie(ctx, this.player.x, this.player.y, 1.45);
      this.drawHud();

      if (this.messageTimer > 0) {
        ctx.save();
        ctx.textAlign = "center";
        pixelRect(ctx, 118, 316, 144, 62, "#020202");
        ctx.strokeStyle = "#ff2aa6";
        ctx.lineWidth = 2;
        ctx.strokeRect(120, 318, 140, 58);
        ctx.fillStyle = "#00f060";
        ctx.font = "700 15px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText(`WAVE ${String(this.wave).padStart(2, "0")}`, 190, 342);
        ctx.fillStyle = "#f0cf3e";
        ctx.fillText("GET READY!", 190, 364);
        ctx.restore();
      }

      if (this.state === "gameover") {
        this.drawOverlay("GAME OVER", "TAP TO DEFEND AGAIN");
      }
      if (this.state === "intro") {
        this.drawIntroOverlay();
      }
    },
  };

  const candy = {
    canvas: document.querySelector("#candyCanvas"),
    ctx: document.querySelector("#candyCanvas").getContext("2d"),
    size: 8,
    types: candyTypes.length,
    board: [],
    goals: [],
    powerupSlots: Array(4).fill(null),
    selectedPowerupSlot: null,
    selected: null,
    activeMatches: new Set(),
    animations: [],
    particles: [],
    scorePops: [],
    shuffleIntro: null,
    hiddenCells: new Set(),
    pointerDown: null,
    busy: false,
    status: "playing",
    score: 0,
    displayScore: 0,
    highScore: readStoredNumber(deweyHighScoreKey, 0),
    gameOverScore: 0,
    gameOverHighScore: readStoredNumber(deweyHighScoreKey, 0),
    moves: 28,
    freeSwitches: 3,
    freeSwitchMode: false,
    freeSwitchSelected: null,
    optionHint: null,
    scoreTween: null,
    sequence: 0,

    reset({ resetScore = true } = {}) {
      if (resetScore) {
        this.score = 0;
      }
      this.displayScore = this.score;
      this.highScore = readStoredNumber(deweyHighScoreKey, 0);
      this.gameOverScore = this.score;
      this.gameOverHighScore = this.highScore;
      this.powerupSlots = Array(4).fill(null);
      this.selectedPowerupSlot = null;
      this.selected = null;
      this.freeSwitches = 3;
      this.freeSwitchMode = false;
      this.freeSwitchSelected = null;
      this.activeMatches = new Set();
      this.animations = [];
      this.particles = [];
      this.scorePops = [];
      this.shuffleIntro = null;
      this.optionHint = null;
      this.hiddenCells = new Set();
      this.scoreTween = null;
      this.sequence += 1;
      this.pointerDown = null;
      this.busy = false;
      this.status = "playing";
      this.goals = this.makeGoals();
      this.moves = this.calculateMoveBudget();
      this.createBoard();
      this.startShuffleIntro();
      this.updateHud();
      this.draw();
    },

    makeGoals() {
      const types = Array.from({ length: this.types }, (_, index) => index)
        .filter((type) => !isPowerupType(type))
        .sort(() => Math.random() - 0.5)
        .slice(0, 4);
      const values = Array(4).fill(10);
      let remaining = 20;
      while (remaining > 0) {
        const index = randInt(values.length);
        if (values[index] >= 20) continue;
        values[index] += 1;
        remaining -= 1;
      }
      return types.map((type, index) => ({
        type,
        target: values[index],
        remaining: values[index],
      }));
    },

    calculateMoveBudget() {
      const totalGoals = this.goals.reduce((sum, goal) => sum + goal.target, 0);
      const theoreticalMinimum = Math.ceil(totalGoals / 3);
      const spread = Math.max(...this.goals.map((goal) => goal.target)) - Math.min(...this.goals.map((goal) => goal.target));
      const inefficiencyBuffer = Math.ceil(theoreticalMinimum * 0.45);
      const diversityBuffer = this.goals.length + Math.ceil(spread / 4);
      return theoreticalMinimum + inefficiencyBuffer + diversityBuffer;
    },

    createBoard() {
      let attempt = 0;
      do {
        this.board = [];
        for (let row = 0; row < this.size; row += 1) {
          this.board[row] = [];
          for (let col = 0; col < this.size; col += 1) {
            this.board[row][col] = this.randomCandy(col, row);
          }
        }
        this.seedGoalMove();
        this.seedOpeningPowerupMoves();
        attempt += 1;
      } while ((this.findMatches().size || !this.hasAvailableMove() || !this.hasGoalMove()) && attempt < 80);
      this.ensureSolvableBoard();
    },

    startShuffleIntro() {
      const now = performance.now();
      const token = this.sequence;
      const { tile, y, boardSize } = this.metrics();
      const center = {
        x: this.canvas.width / 2,
        y: y + boardSize / 2,
      };
      const duration = 640;
      const pieces = [];
      const motes = [];
      const vortices = Array.from({ length: 5 }, (_, index) => ({
        x: center.x + (index - 2) * boardSize * 0.13 + (Math.random() - 0.5) * 58,
        y: center.y + (Math.random() - 0.5) * boardSize * 0.46,
        radius: boardSize * (0.16 + Math.random() * 0.16),
        spin: (Math.random() < 0.5 ? -1 : 1) * (0.82 + Math.random() * 0.95),
        phase: Math.random() * Math.PI * 2,
      }));

      for (let row = 0; row < this.size; row += 1) {
        for (let col = 0; col < this.size; col += 1) {
          const final = this.cellCenter(col, row);
          const angle = Math.random() * Math.PI * 2;
          const radius = boardSize * (0.24 + Math.random() * 0.56);
          pieces.push({
            type: this.board[row][col],
            finalX: final.x,
            finalY: final.y,
            angle,
            radius,
            delay: Math.random() * 92,
            turns: (Math.random() < 0.5 ? -1 : 1) * (1.05 + Math.random() * 1.15),
            rotation: (Math.random() - 0.5) * 1.6,
            spin: (Math.random() < 0.5 ? -1 : 1) * (1.05 + Math.random() * 1.45),
            gustX: (Math.random() < 0.5 ? -1 : 1) * (42 + Math.random() * 84),
            gustY: (Math.random() - 0.5) * 78,
            wobble: 18 + Math.random() * 34,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }

      for (let i = 0; i < 240; i += 1) {
        const vortexIndex = randInt(vortices.length);
        const vortex = vortices[vortexIndex];
        motes.push({
          vortex: vortexIndex,
          angle: Math.random() * Math.PI * 2,
          radius: vortex.radius * (0.25 + Math.random() * 1.05),
          delay: Math.random() * 170,
          duration: duration * (0.58 + Math.random() * 0.52),
          speed: vortex.spin * (1.4 + Math.random() * 2.2),
          size: 1.4 + Math.random() * 4.8,
          alpha: 0.2 + Math.random() * 0.48,
          yScale: 0.38 + Math.random() * 0.32,
          driftX: (Math.random() - 0.5) * 130,
          driftY: -30 - Math.random() * 70,
          front: Math.random() > 0.48,
          streak: Math.random() > 0.62,
          length: 14 + Math.random() * 34,
          phase: Math.random() * Math.PI * 2,
        });
      }

      this.busy = true;
      this.shuffleIntro = {
        start: now,
        duration,
        center,
        radius: tile * 0.265,
        vortices,
        pieces,
        motes,
      };

      window.setTimeout(() => {
        if (token !== this.sequence) return;
        this.shuffleIntro = null;
        this.busy = false;
      }, duration + 70);
    },

    metrics() {
      const tile = 111;
      const boardSize = tile * this.size;
      return {
        tile,
        boardSize,
        x: Math.floor((this.canvas.width - boardSize) / 2),
        y: 505,
        movesPanel: { x: 58, y: 74, w: 170, h: 168 },
        goalsPanel: { x: 252, y: 66, w: 522, h: 204 },
        scorePanel: { x: 800, y: 76, w: 172, h: 166 },
        sign: { x: 232, y: 270, w: 560, h: 260 },
        boosterY: 1440,
      };
    },

    goalSlotCenter(type) {
      const index = this.goals.findIndex((goal) => goal.type === type);
      if (index < 0) return null;
      const { goalsPanel } = this.metrics();
      return {
        x: goalsPanel.x + 100 + index * 108,
        y: goalsPanel.y + 106,
      };
    },

    boosterSlotCenter(index) {
      return {
        x: 260 + index * 170,
        y: this.metrics().boosterY,
      };
    },

    freeSwitchButton() {
      return {
        x: 82,
        y: this.canvas.height - 88,
        radius: 45,
      };
    },

    powerupSlotFromEvent(event) {
      const point = canvasPoint(this.canvas, event);
      for (let i = 0; i < this.powerupSlots.length; i += 1) {
        const slot = this.boosterSlotCenter(i);
        if (Math.hypot(point.x - slot.x, point.y - slot.y) <= 72) return i;
      }
      return -1;
    },

    isFreeSwitchButtonEvent(event) {
      const point = canvasPoint(this.canvas, event);
      const button = this.freeSwitchButton();
      return Math.hypot(point.x - button.x, point.y - button.y) <= button.radius * 1.18;
    },

    toggleFreeSwitchMode() {
      if (this.busy || this.status !== "playing" || this.freeSwitches <= 0) return false;
      this.freeSwitchMode = !this.freeSwitchMode;
      this.freeSwitchSelected = null;
      this.selected = null;
      this.selectedPowerupSlot = null;
      this.pointerDown = null;
      this.draw();
      return true;
    },

    powerupReady(slot) {
      return Boolean(slot && performance.now() >= slot.availableAt);
    },

    selectPowerupSlot(index) {
      if (this.busy || this.status !== "playing") return false;
      const slot = this.powerupSlots[index];
      if (!this.powerupReady(slot)) return false;
      this.selectedPowerupSlot = this.selectedPowerupSlot === index ? null : index;
      this.selected = null;
      this.freeSwitchMode = false;
      this.freeSwitchSelected = null;
      this.pointerDown = null;
      this.draw();
      return true;
    },

    selectedPowerupType() {
      if (this.selectedPowerupSlot === null) return null;
      const slot = this.powerupSlots[this.selectedPowerupSlot];
      if (!this.powerupReady(slot)) {
        if (!slot) this.selectedPowerupSlot = null;
        return null;
      }
      return slot.type;
    },

    consumeSelectedPowerup(expectedType) {
      if (this.selectedPowerupType() !== expectedType) return false;
      this.powerupSlots[this.selectedPowerupSlot] = null;
      this.selectedPowerupSlot = null;
      this.selected = null;
      this.freeSwitchSelected = null;
      this.pointerDown = null;
      return true;
    },

    firstEmptyPowerupSlot() {
      return this.powerupSlots.findIndex((slot) => !slot);
    },

    hasInventoryPowerups() {
      return this.powerupSlots.some(Boolean);
    },

    hasEscapeTools() {
      return this.freeSwitches > 0 || this.hasInventoryPowerups();
    },

    updateHighScore() {
      if (this.score <= this.highScore) return;
      this.highScore = this.score;
      writeStoredNumber(deweyHighScoreKey, this.highScore);
    },

    endRun(status = "lost") {
      this.status = status;
      this.busy = false;
      this.selected = null;
      this.freeSwitchMode = false;
      this.freeSwitchSelected = null;
      this.selectedPowerupSlot = null;
      this.pointerDown = null;
      this.optionHint = null;
      this.gameOverScore = this.score;
      this.updateHighScore();
      this.gameOverHighScore = this.highScore;
      this.updateHud();
    },

    startNextList() {
      this.selected = null;
      this.freeSwitchMode = false;
      this.freeSwitchSelected = null;
      this.selectedPowerupSlot = null;
      this.pointerDown = null;
      this.optionHint = null;
      this.activeMatches = new Set();
      this.animations = [];
      this.particles = [];
      this.scorePops = [];
      this.hiddenCells = new Set();
      this.scoreTween = null;
      this.displayScore = this.score;
      this.powerupSlots = Array(4).fill(null);
      this.sequence += 1;
      this.busy = false;
      this.status = "playing";
      this.goals = this.makeGoals();
      this.moves = this.calculateMoveBudget();
      this.createBoard();
      this.startShuffleIntro();
      this.updateHud();
      this.draw();
    },

    triggerOptionHint() {
      const targets = [];
      if (this.freeSwitches > 0) targets.push("free");
      for (let i = 0; i < this.powerupSlots.length; i += 1) {
        if (this.powerupSlots[i]) targets.push(`slot:${i}`);
      }
      if (!targets.length) return false;
      this.optionHint = {
        targets,
        start: performance.now(),
        duration: 1180,
      };
      return true;
    },

    optionHintTransform(target, now = performance.now()) {
      const hint = this.optionHint;
      if (!hint || !hint.targets.includes(target)) return { y: 0, scale: 1 };
      const t = clamp((now - hint.start) / hint.duration, 0, 1);
      const wave = Math.sin(t * Math.PI * 4);
      const envelope = Math.sin(t * Math.PI);
      return {
        y: -wave * 18 * envelope,
        scale: 1 + Math.abs(wave) * 0.16 * envelope,
      };
    },

    resolveIdleBoard() {
      this.busy = false;
      this.activeMatches = new Set();
      if (this.goalsComplete()) {
        this.startNextList();
        return;
      } else if (this.moves > 0 && this.hasAvailableMove()) {
        this.status = "playing";
      } else if (this.hasEscapeTools()) {
        this.status = "playing";
        this.selected = null;
        this.pointerDown = null;
        this.triggerOptionHint();
      } else {
        this.endRun("lost");
      }
      this.updateHud();
      this.draw();
    },

    pulseEscapeToolsForDeadlockedBoard() {
      if (this.hasAvailableMove()) return false;
      if (!this.hasEscapeTools()) {
        this.resolveIdleBoard();
        return true;
      }
      this.status = "playing";
      this.selected = null;
      this.pointerDown = null;
      this.triggerOptionHint();
      this.updateHud();
      this.draw();
      return true;
    },

    playAgainButton() {
      return {
        x: this.canvas.width / 2 - 170,
        y: this.canvas.height / 2 + 224,
        w: 340,
        h: 78,
      };
    },

    isPlayAgainButtonEvent(event) {
      const point = canvasPoint(this.canvas, event);
      const button = this.playAgainButton();
      return (
        point.x >= button.x &&
        point.x <= button.x + button.w &&
        point.y >= button.y &&
        point.y <= button.y + button.h
      );
    },

    remainingGoalTypes() {
      return this.goals.filter((goal) => goal.remaining > 0).map((goal) => goal.type);
    },

    weightedCandy(blocked = new Set(), goalBias = 0.62) {
      const candidates = Array.from({ length: this.types }, (_, index) => index).filter((type) => !blocked.has(type));
      if (!candidates.length) return randInt(this.types);
      const activeGoals = this.goals.filter((goal) => goal.remaining > 0 && !blocked.has(goal.type));
      if (activeGoals.length && Math.random() < goalBias) {
        const total = activeGoals.reduce((sum, goal) => sum + goal.remaining, 0);
        let roll = Math.random() * total;
        for (const goal of activeGoals) {
          roll -= goal.remaining;
          if (roll <= 0) return goal.type;
        }
        return activeGoals[activeGoals.length - 1].type;
      }
      return candidates[randInt(candidates.length)];
    },

    randomCandy(col, row) {
      const blocked = new Set();
      if (col >= 2 && this.board[row]?.[col - 1] === this.board[row]?.[col - 2]) {
        blocked.add(this.board[row][col - 1]);
      }
      if (row >= 2 && this.board[row - 1]?.[col] === this.board[row - 2]?.[col]) {
        blocked.add(this.board[row - 1][col]);
      }
      return this.weightedCandy(blocked, 0.58);
    },

    updateHud() {
      candyScoreEl.textContent = this.score;
      candyMovesEl.textContent = this.moves;
    },

    cellFromEvent(event) {
      const point = canvasPoint(this.canvas, event);
      const { x, y, tile } = this.metrics();
      const col = Math.floor((point.x - x) / tile);
      const row = Math.floor((point.y - y) / tile);
      if (col < 0 || col >= this.size || row < 0 || row >= this.size) return null;
      return { col, row };
    },

    isAdjacent(a, b) {
      return Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;
    },

    cellCenter(col, row) {
      const { x, y, tile } = this.metrics();
      return {
        x: x + col * tile + tile / 2,
        y: y + row * tile + tile / 2,
      };
    },

    swap(a, b) {
      const next = this.board[a.row][a.col];
      this.board[a.row][a.col] = this.board[b.row][b.col];
      this.board[b.row][b.col] = next;
    },

    activateTnt(cell) {
      if (this.busy || this.status !== "playing" || !this.consumeSelectedPowerup(tntType)) return false;
      const cells = [];
      for (let row = cell.row - 1; row <= cell.row + 1; row += 1) {
        for (let col = cell.col - 1; col <= cell.col + 1; col += 1) {
          if (col < 0 || col >= this.size || row < 0 || row >= this.size) continue;
          if (this.board[row][col] < 0) continue;
          cells.push({ col, row, key: cellKey(col, row), type: this.board[row][col], center: this.cellCenter(col, row) });
        }
      }
      if (!cells.length) return false;

      const token = this.sequence;
      const now = performance.now();
      const blastKeys = new Set(cells.map((piece) => piece.key));
      const blastCenter = this.cellCenter(cell.col, cell.row);
      this.busy = true;
      this.activeMatches = blastKeys;
      this.collectGoals(blastKeys);

      for (let i = 0; i < cells.length; i += 1) {
        const piece = cells[i];
        this.hiddenCells.add(piece.key);
        this.board[piece.row][piece.col] = -1;
        this.addBurst(piece.type, piece.center.x, piece.center.y, 16);
        this.animations.push({
          kind: "explode",
          layer: "board",
          type: piece.type,
          x: piece.center.x,
          y: piece.center.y,
          dx: (piece.center.x - blastCenter.x) * 0.34 + (Math.random() - 0.5) * 24,
          dy: (piece.center.y - blastCenter.y) * 0.34 + (Math.random() - 0.5) * 24,
          spin: (Math.random() - 0.5) * 1.4,
          start: now + i * 12,
          duration: 420,
        });
      }
      this.addBurst(tntType, blastCenter.x, blastCenter.y, 34);
      this.addScore(cells.length * 110 + 450, blastCenter.x, blastCenter.y);
      this.updateHud();
      this.draw();

      window.setTimeout(() => {
        if (token !== this.sequence) return;
        for (const key of blastKeys) {
          this.hiddenCells.delete(key);
        }
        this.activeMatches = new Set();
        this.applyDropAndRefillAnimations(token);
      }, 520);
      return true;
    },

    activateMagnet(a, b) {
      if (this.selectedPowerupType() !== magnetType) return false;
      if (this.busy || this.status !== "playing" || !this.isAdjacent(a, b)) return false;
      const horizontal = a.row === b.row && a.col !== b.col;
      const vertical = a.col === b.col && a.row !== b.row;
      if (!horizontal && !vertical) {
        this.selected = b;
        this.draw();
        return false;
      }
      if (!this.consumeSelectedPowerup(magnetType)) return false;

      const axis = horizontal ? "row" : "col";
      const line = horizontal ? a.row : a.col;
      const direction = horizontal ? (b.col > a.col ? 1 : -1) : b.row > a.row ? 1 : -1;
      const token = this.sequence;
      const now = performance.now();
      const duration = 380;
      const currentValues = horizontal ? this.board[line].slice() : Array.from({ length: this.size }, (_, row) => this.board[row][line]);
      const nextValues = Array(this.size).fill(-1);
      const pieces = [];
      for (let index = 0; index < this.size; index += 1) {
        const toIndex = (index + direction + this.size) % this.size;
        nextValues[toIndex] = currentValues[index];
        const from = horizontal ? { col: index, row: line } : { col: line, row: index };
        const to = horizontal ? { col: toIndex, row: line } : { col: line, row: toIndex };
        pieces.push({
          type: currentValues[index],
          from,
          to,
        });
        this.hiddenCells.add(cellKey(from.col, from.row));
      }

      this.busy = true;
      this.animations.push({
        kind: "rowShift",
        layer: "board",
        axis,
        line,
        direction,
        pieces,
        start: now,
        duration,
      });
      for (let i = 0; i < 32; i += 1) {
        const index = i % this.size;
        const center = horizontal ? this.cellCenter(index, line) : this.cellCenter(line, index);
        this.particles.push({
          x: center.x + (Math.random() - 0.5) * 36,
          y: center.y + (Math.random() - 0.5) * 32,
          vx: horizontal ? direction * (120 + Math.random() * 170) : -50 + Math.random() * 100,
          vy: vertical ? direction * (120 + Math.random() * 170) : -50 + Math.random() * 100,
          size: 2 + Math.random() * 4,
          color: i % 2 ? "#7de3ff" : "#ffd44d",
          start: now + Math.random() * 120,
          duration: 360 + Math.random() * 180,
        });
      }
      this.draw();

      window.setTimeout(() => {
        if (token !== this.sequence) return;
        if (horizontal) {
          this.board[line] = nextValues;
        } else {
          for (let row = 0; row < this.size; row += 1) {
            this.board[row][line] = nextValues[row];
          }
        }
        for (const piece of pieces) {
          this.hiddenCells.delete(cellKey(piece.from.col, piece.from.row));
        }
        const matches = this.findMatches();
        if (matches.size) {
          this.resolveMatches(matches);
          return;
        }
        this.resolveIdleBoard();
      }, duration + 40);
      return true;
    },

    trySwap(a, b) {
      if (this.selectedPowerupType() === magnetType) return this.activateMagnet(a, b);
      if (this.busy || this.status !== "playing" || !this.isAdjacent(a, b)) return false;
      if (this.moves <= 0) {
        this.resolveIdleBoard();
        return false;
      }
      this.swap(a, b);
      const matches = this.findMatches();
      this.swap(a, b);
      if (!matches.size) {
        this.busy = true;
        this.selected = null;
        this.animateSwap(a, b, false, () => {
          this.busy = false;
          if (this.pulseEscapeToolsForDeadlockedBoard()) return;
          this.selected = b;
        });
        return true;
      }

      this.busy = true;
      this.selected = null;
      this.pointerDown = null;
      this.animateSwap(a, b, true, () => {
        this.swap(a, b);
        this.moves -= 1;
        this.updateHud();
        this.resolveMatches(matches);
      });
      return true;
    },

    tryFreeSwitch(a, b) {
      if (this.busy || this.status !== "playing" || this.freeSwitches <= 0) return;
      if (a.col === b.col && a.row === b.row) {
        this.freeSwitchSelected = a;
        this.draw();
        return;
      }

      this.busy = true;
      this.selected = null;
      this.freeSwitchMode = false;
      this.freeSwitchSelected = null;
      this.pointerDown = null;
      this.freeSwitches -= 1;

      const start = performance.now();
      const duration = 360;
      const token = this.sequence;
      const typeA = this.board[a.row][a.col];
      const typeB = this.board[b.row][b.col];
      const keyA = cellKey(a.col, a.row);
      const keyB = cellKey(b.col, b.row);
      this.hiddenCells.add(keyA);
      this.hiddenCells.add(keyB);
      this.animations.push({
        kind: "swap",
        valid: true,
        start,
        duration,
        pieces: [
          { type: typeA, from: { ...a }, to: { ...b } },
          { type: typeB, from: { ...b }, to: { ...a } },
        ],
      });
      this.draw();

      window.setTimeout(() => {
        if (token !== this.sequence) return;
        this.swap(a, b);
        this.hiddenCells.delete(keyA);
        this.hiddenCells.delete(keyB);
        const matches = this.findMatches();
        if (matches.size) {
          this.resolveMatches(matches);
          return;
        }
        this.resolveIdleBoard();
      }, duration + 16);
    },

    handleFreeSwitchCell(cell) {
      if (!this.freeSwitchMode || this.freeSwitches <= 0 || this.busy) return;
      if (!this.freeSwitchSelected) {
        this.freeSwitchSelected = cell;
        this.draw();
        return;
      }
      this.tryFreeSwitch(this.freeSwitchSelected, cell);
    },

    handleTap(cell) {
      if (this.busy) return;
      if (this.status !== "playing") {
        return;
      }
      if (this.selectedPowerupType() === tntType) {
        this.activateTnt(cell);
        return;
      }
      if (this.freeSwitchMode) {
        this.handleFreeSwitchCell(cell);
        return;
      }
      if (this.selected && this.isAdjacent(this.selected, cell)) {
        this.trySwap(this.selected, cell);
        return;
      }
      this.selected = cell;
      this.draw();
    },

    animateSwap(a, b, valid, onDone) {
      const start = performance.now();
      const duration = valid ? 210 : 360;
      const token = this.sequence;
      const typeA = this.board[a.row][a.col];
      const typeB = this.board[b.row][b.col];
      this.hiddenCells.add(cellKey(a.col, a.row));
      this.hiddenCells.add(cellKey(b.col, b.row));
      this.animations.push({
        kind: "swap",
        valid,
        start,
        duration,
        pieces: [
          { type: typeA, from: { ...a }, to: { ...b } },
          { type: typeB, from: { ...b }, to: { ...a } },
        ],
      });
      window.setTimeout(() => {
        if (token !== this.sequence) return;
        if (valid) onDone();
        this.hiddenCells.delete(cellKey(a.col, a.row));
        this.hiddenCells.delete(cellKey(b.col, b.row));
        if (!valid) onDone();
      }, duration + 16);
    },

    findMatches() {
      const matches = new Set();
      for (let row = 0; row < this.size; row += 1) {
        let runStart = 0;
        for (let col = 1; col <= this.size; col += 1) {
          const current = col < this.size ? this.board[row][col] : null;
          const previous = this.board[row][col - 1];
          if (current !== previous || previous < 0) {
            if (col - runStart >= 3 && previous >= 0) {
              for (let matchCol = runStart; matchCol < col; matchCol += 1) {
                matches.add(cellKey(matchCol, row));
              }
            }
            runStart = col;
          }
        }
      }

      for (let col = 0; col < this.size; col += 1) {
        let runStart = 0;
        for (let row = 1; row <= this.size; row += 1) {
          const current = row < this.size ? this.board[row][col] : null;
          const previous = this.board[row - 1][col];
          if (current !== previous || previous < 0) {
            if (row - runStart >= 3 && previous >= 0) {
              for (let matchRow = runStart; matchRow < row; matchRow += 1) {
                matches.add(cellKey(col, matchRow));
              }
            }
            runStart = row;
          }
        }
      }
      return matches;
    },

    hasAvailableMove() {
      for (let row = 0; row < this.size; row += 1) {
        for (let col = 0; col < this.size; col += 1) {
          const here = { col, row };
          for (const there of [
            { col: col + 1, row },
            { col, row: row + 1 },
          ]) {
            if (there.col >= this.size || there.row >= this.size) continue;
            this.swap(here, there);
            const hasMatch = this.findMatches().size > 0;
            this.swap(here, there);
            if (hasMatch) return true;
          }
        }
      }
      return false;
    },

    moveMatches(a, b) {
      this.swap(a, b);
      const matches = this.findMatches();
      this.swap(a, b);
      return matches;
    },

    hasGoalMove() {
      const goalTypes = new Set(this.remainingGoalTypes());
      if (!goalTypes.size) return true;
      for (let row = 0; row < this.size; row += 1) {
        for (let col = 0; col < this.size; col += 1) {
          const here = { col, row };
          for (const there of [
            { col: col + 1, row },
            { col, row: row + 1 },
          ]) {
            if (there.col >= this.size || there.row >= this.size) continue;
            this.swap(here, there);
            const matches = this.findMatches();
            const goalMatch = Array.from(matches).some((key) => {
              const [matchCol, matchRow] = key.split(",").map(Number);
              return goalTypes.has(this.board[matchRow][matchCol]);
            });
            this.swap(here, there);
            if (goalMatch) return true;
          }
        }
      }
      return false;
    },

    seedMatchMoveForType(type, attempts = 260) {
      const blockers = Array.from({ length: this.types }, (_, index) => index).filter((value) => value !== type);
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const row = randInt(this.size - 1);
        const col = randInt(this.size - 2);
        const blocker = blockers[randInt(blockers.length)];
        const changed = [
          { col, row, value: this.board[row][col] },
          { col: col + 1, row, value: this.board[row][col + 1] },
          { col: col + 2, row, value: this.board[row][col + 2] },
          { col: col + 1, row: row + 1, value: this.board[row + 1][col + 1] },
        ];
        this.board[row][col] = type;
        this.board[row][col + 1] = blocker;
        this.board[row][col + 2] = type;
        this.board[row + 1][col + 1] = type;
        const plannedMatches = this.moveMatches({ col: col + 1, row }, { col: col + 1, row: row + 1 });
        const plannedTypeMatch =
          plannedMatches.has(cellKey(col, row)) &&
          plannedMatches.has(cellKey(col + 1, row)) &&
          plannedMatches.has(cellKey(col + 2, row));
        if (!this.findMatches().size && plannedTypeMatch) return true;
        for (const cell of changed) {
          this.board[cell.row][cell.col] = cell.value;
        }
      }
      return false;
    },

    seedGoalMove() {
      const goals = this.goals.filter((goal) => goal.remaining > 0).sort((a, b) => b.remaining - a.remaining);
      if (!goals.length) return true;
      return this.seedMatchMoveForType(goals[0].type);
    },

    seedOpeningPowerupMoves() {
      const powerups = Array.from({ length: this.types }, (_, index) => index)
        .filter((type) => isPowerupType(type))
        .sort(() => Math.random() - 0.5);
      for (const type of powerups) {
        if (Math.random() < 0.68) {
          this.seedMatchMoveForType(type, 140);
        }
      }
    },

    ensureSolvableBoard() {
      let guard = 0;
      while ((!this.hasAvailableMove() || !this.hasGoalMove() || this.findMatches().size) && guard < 30) {
        this.shuffleBoard(true);
        guard += 1;
      }
      if (!this.hasGoalMove() || this.findMatches().size) {
        this.seedGoalMove();
      }
    },

    shuffleBoard(requireGoalMove = false) {
      const values = this.board.flat();
      let guard = 0;
      do {
        for (let i = values.length - 1; i > 0; i -= 1) {
          const j = randInt(i + 1);
          [values[i], values[j]] = [values[j], values[i]];
        }
        for (let row = 0; row < this.size; row += 1) {
          for (let col = 0; col < this.size; col += 1) {
            this.board[row][col] = values[row * this.size + col];
          }
        }
        guard += 1;
      } while ((this.findMatches().size || !this.hasAvailableMove() || (requireGoalMove && !this.hasGoalMove())) && guard < 80);
      if (requireGoalMove && !this.hasGoalMove()) {
        this.seedGoalMove();
      }
    },

    matchGroups(matches) {
      const pending = new Set(matches);
      const groups = [];
      for (const startKey of matches) {
        if (!pending.has(startKey)) continue;
        pending.delete(startKey);
        const [startCol, startRow] = startKey.split(",").map(Number);
        const type = this.board[startRow][startCol];
        const stack = [{ key: startKey, col: startCol, row: startRow }];
        const pieces = [];

        while (stack.length) {
          const piece = stack.pop();
          const center = this.cellCenter(piece.col, piece.row);
          pieces.push({ ...piece, type, center });
          for (const [nextCol, nextRow] of [
            [piece.col + 1, piece.row],
            [piece.col - 1, piece.row],
            [piece.col, piece.row + 1],
            [piece.col, piece.row - 1],
          ]) {
            const nextKey = cellKey(nextCol, nextRow);
            if (!pending.has(nextKey) || this.board[nextRow]?.[nextCol] !== type) continue;
            pending.delete(nextKey);
            stack.push({ key: nextKey, col: nextCol, row: nextRow });
          }
        }

        groups.push({
          type,
          pieces,
          center: {
            x: pieces.reduce((sum, piece) => sum + piece.center.x, 0) / pieces.length,
            y: pieces.reduce((sum, piece) => sum + piece.center.y, 0) / pieces.length,
          },
        });
      }
      return groups;
    },

    collectGoals(matches) {
      for (const key of matches) {
        const [col, row] = key.split(",").map(Number);
        const type = this.board[row][col];
        const goal = this.goals.find((item) => item.type === type);
        if (goal && goal.remaining > 0) {
          goal.remaining -= 1;
        }
      }
    },

    goalsComplete() {
      return this.goals.every((goal) => goal.remaining <= 0);
    },

    pieceColor(type) {
      if (type === 2) return "#ffd44d";
      if (type === 4) return "#b87532";
      return candyTypes[type]?.color ?? "#fff3cf";
    },

    addScore(points, x, y) {
      const now = performance.now();
      this.scoreTween = {
        from: this.displayScore,
        to: this.score + points,
        start: now,
        duration: 540,
      };
      this.score += points;
      this.scorePops.push({
        text: `+${points}`,
        x,
        y,
        start: now,
        duration: 780,
      });
    },

    addBurst(type, x, y, count = 18) {
      const now = performance.now();
      const color = this.pieceColor(type);
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.25;
        const speed = 95 + Math.random() * 190;
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 60,
          size: 4 + Math.random() * 7,
          color,
          start: now,
          duration: 520 + Math.random() * 260,
        });
      }
    },

    addOrganizeTrail(type, from, to, count = 10) {
      const now = performance.now();
      const color = this.pieceColor(type);
      for (let i = 0; i < count; i += 1) {
        const offsetX = (Math.random() - 0.5) * 22;
        const offsetY = (Math.random() - 0.5) * 22;
        this.particles.push({
          mode: "organize",
          fromX: from.x + offsetX,
          fromY: from.y + offsetY,
          toX: to.x + (Math.random() - 0.5) * 52,
          toY: to.y + Math.random() * 30,
          x: from.x,
          y: from.y,
          vx: -18 + Math.random() * 36,
          vy: -34 - Math.random() * 44,
          size: 2.5 + Math.random() * 4.5,
          color,
          start: now + i * 28 + Math.random() * 40,
          duration: 500 + Math.random() * 260,
          wobble: 10 + Math.random() * 24,
          phase: Math.random() * Math.PI * 2,
        });
      }
    },

    updateEffects(now) {
      this.animations = this.animations.filter((animation) => now < animation.start + animation.duration + 40);
      this.particles = this.particles.filter((particle) => now < particle.start + particle.duration);
      this.scorePops = this.scorePops.filter((pop) => now < pop.start + pop.duration);
      if (this.shuffleIntro && now >= this.shuffleIntro.start + this.shuffleIntro.duration + 70) {
        this.shuffleIntro = null;
        this.busy = false;
      }
      if (this.optionHint && now >= this.optionHint.start + this.optionHint.duration + 40) {
        this.optionHint = null;
      }
      if (this.scoreTween) {
        const t = clamp((now - this.scoreTween.start) / this.scoreTween.duration, 0, 1);
        this.displayScore = this.scoreTween.from + (this.scoreTween.to - this.scoreTween.from) * easeOut(t);
        if (t >= 1) {
          this.displayScore = this.scoreTween.to;
          this.scoreTween = null;
        }
      } else {
        this.displayScore = this.score;
      }
    },

    resolveMatches(matches = this.findMatches()) {
      if (!matches.size) {
        this.resolveIdleBoard();
        return;
      }

      this.busy = true;
      const token = this.sequence;
      const now = performance.now();
      this.activeMatches = matches;
      const activeGoalTypes = new Set(this.remainingGoalTypes());
      const matchedPieces = Array.from(matches).map((key) => {
        const [col, row] = key.split(",").map(Number);
        const type = this.board[row][col];
        const center = this.cellCenter(col, row);
        return { key, col, row, type, center };
      });
      const matchedGroups = this.matchGroups(matches);
      const collectedPowerupKeys = new Set();
      let overflowPowerupPoints = 0;
      this.collectGoals(matches);
      const groups = new Map();
      for (const piece of matchedPieces) {
        const group = groups.get(piece.type) ?? { x: 0, y: 0, count: 0 };
        group.x += piece.center.x;
        group.y += piece.center.y;
        group.count += 1;
        groups.set(piece.type, group);
      }
      const groupCenters = new Map();
      for (const [type, group] of groups.entries()) {
        groupCenters.set(type, {
          x: group.x / group.count,
          y: group.y / group.count,
        });
      }
      const scoreCenter = {
        x: matchedPieces.reduce((sum, piece) => sum + piece.center.x, 0) / matchedPieces.length,
        y: matchedPieces.reduce((sum, piece) => sum + piece.center.y, 0) / matchedPieces.length,
      };
      const exitSide = Math.random() < 0.5 ? -1 : 1;
      const sideTarget = {
        x: exitSide < 0 ? -150 : this.canvas.width + 150,
        y: scoreCenter.y + (Math.random() - 0.5) * 90,
      };
      let clearDelay = 0;
      for (const group of matchedGroups) {
        if (!isPowerupType(group.type)) continue;
        const slotIndex = this.firstEmptyPowerupSlot();
        if (slotIndex < 0) {
          overflowPowerupPoints += 1400 + group.pieces.length * 180;
          continue;
        }

        const target = this.boosterSlotCenter(slotIndex);
        const delay = 80;
        const duration = 700;
        this.powerupSlots[slotIndex] = {
          type: group.type,
          availableAt: now + delay + duration,
        };
        for (const piece of group.pieces) {
          collectedPowerupKeys.add(piece.key);
        }
        this.animations.push({
          kind: "collectPowerup",
          type: group.type,
          x: group.center.x,
          y: group.center.y,
          targetX: target.x,
          targetY: target.y,
          start: now + delay,
          duration,
        });
        this.addBurst(group.type, group.center.x, group.center.y, 12);
        this.addOrganizeTrail(group.type, group.center, target, 12);
        clearDelay = Math.max(clearDelay, delay + duration);
      }

      for (let i = 0; i < matchedPieces.length; i += 1) {
        const piece = matchedPieces[i];
        if (collectedPowerupKeys.has(piece.key)) {
          this.hiddenCells.add(piece.key);
          this.board[piece.row][piece.col] = -1;
          continue;
        }
        const groupCenter = groupCenters.get(piece.type) ?? scoreCenter;
        const goalTarget = activeGoalTypes.has(piece.type) ? this.goalSlotCenter(piece.type) : null;
        const delay = Math.min(84, i * 14);
        const duration = 650 + Math.random() * 70;
        const gather = {
          x: piece.center.x + (groupCenter.x - piece.center.x) * 0.38,
          y: piece.center.y + (groupCenter.y - piece.center.y) * 0.38,
        };
        const exit = goalTarget
          ? {
              x: goalTarget.x + (piece.center.x - groupCenter.x) * 0.08 + (Math.random() - 0.5) * 14,
              y: goalTarget.y + (piece.center.y - groupCenter.y) * 0.08 + (Math.random() - 0.5) * 14,
            }
          : {
              x: sideTarget.x + exitSide * Math.random() * 72 + (piece.center.x - groupCenter.x) * 0.18,
              y: sideTarget.y + (piece.center.y - groupCenter.y) * 0.18 + (Math.random() - 0.5) * 44,
            };
        clearDelay = Math.max(clearDelay, delay + duration);
        this.hiddenCells.add(piece.key);
        this.animations.push({
          kind: "organize",
          type: piece.type,
          x: piece.center.x,
          y: piece.center.y,
          gatherX: gather.x,
          gatherY: gather.y,
          exitX: exit.x,
          exitY: exit.y,
          start: now + delay,
          duration,
        });
        this.addOrganizeTrail(piece.type, piece.center, exit, 7);
        this.board[piece.row][piece.col] = -1;
      }
      for (const key of matches) {
        this.hiddenCells.add(key);
      }
      const points = matches.size * 70 + Math.max(0, matches.size - 3) * 35 + overflowPowerupPoints;
      this.addScore(points, scoreCenter.x, scoreCenter.y);
      this.updateHud();
      this.draw();

      window.setTimeout(() => {
        if (token !== this.sequence) return;
        for (const key of matches) {
          this.hiddenCells.delete(key);
        }
        this.activeMatches = new Set();
        this.applyDropAndRefillAnimations(token);
      }, clearDelay + 80);
    },

    dropCandies() {
      for (let col = 0; col < this.size; col += 1) {
        const column = [];
        for (let row = this.size - 1; row >= 0; row -= 1) {
          const value = this.board[row][col];
          if (value >= 0) column.push(value);
        }
        for (let row = this.size - 1; row >= 0; row -= 1) {
          this.board[row][col] = column[this.size - 1 - row] ?? -1;
        }
      }
    },

    refillCandies() {
      for (let row = 0; row < this.size; row += 1) {
        for (let col = 0; col < this.size; col += 1) {
          if (this.board[row][col] < 0) this.board[row][col] = this.weightedCandy(new Set(), 0.72);
        }
      }
    },

    applyDropAndRefillAnimations(token = this.sequence) {
      const now = performance.now();
      const nextBoard = Array.from({ length: this.size }, () => Array(this.size).fill(-1));
      let maxDuration = 0;

      for (let col = 0; col < this.size; col += 1) {
        const survivors = [];
        for (let row = this.size - 1; row >= 0; row -= 1) {
          const type = this.board[row][col];
          if (type >= 0) survivors.push({ type, fromRow: row });
        }

        let targetRow = this.size - 1;
        for (const survivor of survivors) {
          nextBoard[targetRow][col] = survivor.type;
          if (survivor.fromRow !== targetRow) {
            const distance = Math.abs(targetRow - survivor.fromRow);
            const duration = Math.min(520, 230 + distance * 48);
            maxDuration = Math.max(maxDuration, duration);
            this.animations.push({
              kind: "fall",
              type: survivor.type,
              from: { col, row: survivor.fromRow },
              to: { col, row: targetRow },
              start: now,
              duration,
            });
          }
          targetRow -= 1;
        }

        const missing = targetRow + 1;
        for (let row = targetRow; row >= 0; row -= 1) {
          const type = this.weightedCandy(new Set(), 0.72);
          nextBoard[row][col] = type;
          const fromRow = row - missing - 1;
          const distance = Math.abs(row - fromRow);
          const duration = Math.min(560, 250 + distance * 42);
          const delay = (missing - row) * 10;
          maxDuration = Math.max(maxDuration, duration + delay);
          this.animations.push({
            kind: "fall",
            type,
            from: { col, row: fromRow },
            to: { col, row },
            start: now + delay,
            duration,
          });
        }
      }

      this.board = nextBoard;

      if (!maxDuration) {
        this.resolveMatches();
        return;
      }

      this.draw();
      window.setTimeout(() => {
        if (token !== this.sequence) return;
        this.resolveMatches();
      }, maxDuration + 90);
    },

    drawPieceIcon(type, centerX, centerY, radius) {
      const { ctx } = this;
      const drawSize = radius * (type === 0 ? 2.48 : 2.78);
      if (type === 2 && drawImageFit(ctx, deweyImages.lighthouseBook, centerX, centerY, drawSize, drawSize)) {
        return;
      }
      if (type === 4 && drawImageFit(ctx, deweyImages.puzzleBook, centerX, centerY, drawSize, drawSize)) {
        return;
      }
      if (type === 5 && drawImageFit(ctx, deweyImages.bibleBook, centerX, centerY, radius * 3.38, radius * 3.38)) {
        return;
      }
      if (type === 8 && drawImageFit(ctx, deweyImages.forbesMagazine, centerX, centerY, radius * 3.38, radius * 3.38)) {
        return;
      }
      if (type === 9 && drawImageFit(ctx, deweyImages.tumbleweed, centerX, centerY, radius * 3.56, radius * 3.56)) {
        return;
      }
      if (type === 10 && drawImageFit(ctx, deweyImages.wantedPoster, centerX, centerY, radius * 3.55, radius * 3.55)) {
        return;
      }
      if (isPowerupType(type)) {
        const sprite = deweyBoosterSprites[candyTypes[type].boosterSprite];
        const offset = powerupDrawOffsets[candyTypes[type].accent] ?? { x: 0, y: 0 };
        if (
          sprite &&
          drawAtlasSprite(
            ctx,
            deweyImages.pieces,
            sprite,
            centerX + radius * offset.x,
            centerY + radius * offset.y,
            radius * 3.16,
            radius * 3.16,
          )
        ) {
          return;
        }
      }
      const sprite = deweyPieceSprites[type];
      if (sprite && drawAtlasSprite(ctx, deweyImages.pieces, sprite, centerX, centerY, drawSize, drawSize)) {
        return;
      }

      const color = candyTypes[type]?.color ?? "#ffffff";
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.shadowColor = "rgba(0,0,0,0.26)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(255,255,255,0.48)";
      ctx.lineWidth = 2;

      if (type === 0) {
        roundedRect(ctx, -radius * 0.92, -radius * 0.62, radius * 1.84, radius * 1.24, radius * 0.18);
      } else if (type === 1) {
        roundedRect(ctx, -radius * 0.78, -radius * 0.78, radius * 1.56, radius * 1.56, radius * 0.22);
      } else if (type === 2) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
      } else if (type === 3) {
        roundedRect(ctx, -radius * 0.76, -radius * 0.76, radius * 1.52, radius * 1.52, radius * 0.32);
      } else if (type === 4) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.92, 0, Math.PI * 2);
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 0.72, radius, 0, 0, Math.PI * 2);
      }

      ctx.fill();
      ctx.stroke();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = "rgba(255,255,255,0.36)";
      ctx.beginPath();
      ctx.ellipse(-radius * 0.24, -radius * 0.32, radius * 0.24, radius * 0.11, -0.45, 0, Math.PI * 2);
      ctx.fill();

      if (type === 0) drawBook(ctx, 0, 0, radius * 1.12, "#d83e4d");
      if (type === 1) drawPuzzle(ctx, 0, 0, radius * 1.04, "#c778ff");
      if (type === 2) drawDogPaw(ctx, 0, 1, radius * 1.1);
      if (type === 3) drawCactus(ctx, 0, 1, radius * 1.18);
      if (type === 4) drawCross(ctx, 0, 0, radius * 1.08, "#fff1a8", "#7b5b19");
      if (type === 5) drawLighthouse(ctx, 0, 0, radius * 1.18);
      ctx.restore();
    },

    drawBackground() {
      const { ctx, canvas } = this;
      if (imageLoaded(deweyImages.background)) {
        ctx.drawImage(deweyImages.background, 0, 0, canvas.width, canvas.height);
      } else {
        const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        bg.addColorStop(0, "#29aee2");
        bg.addColorStop(0.48, "#e5a259");
        bg.addColorStop(1, "#6f3518");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.save();
      ctx.fillStyle = "rgba(81, 37, 14, 0.24)";
      ctx.fillRect(0, canvas.height - 238, canvas.width, 238);
      ctx.globalAlpha = 0.5;
      drawDustDevil(ctx, canvas.width * 0.5, 720, 165, performance.now() / 900);
      ctx.restore();
    },

    drawPanel() {
      const { ctx } = this;
      const { movesPanel, goalsPanel, scorePanel, sign } = this.metrics();
      const uiReady = imageLoaded(deweyImages.ui);

      if (uiReady) {
        ctx.drawImage(deweyImages.ui, 42, 65, 260, 292, movesPanel.x, movesPanel.y, movesPanel.w, movesPanel.h);
        ctx.drawImage(deweyImages.ui, 324, 56, 660, 294, goalsPanel.x, goalsPanel.y, goalsPanel.w, goalsPanel.h);
      } else {
        drawWesternPanel(ctx, movesPanel.x, movesPanel.y, movesPanel.w, movesPanel.h, 18);
        drawWesternPanel(ctx, goalsPanel.x, goalsPanel.y, goalsPanel.w, goalsPanel.h, 24);
      }
      drawWesternPanel(ctx, scorePanel.x, scorePanel.y, scorePanel.w, scorePanel.h, 18);

      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff0cb";
      ctx.strokeStyle = "#4f260f";
      ctx.lineWidth = 6;
      ctx.font = "900 30px Georgia, serif";
      if (!uiReady) {
        ctx.strokeText("MOVES", movesPanel.x + movesPanel.w / 2, movesPanel.y + 46);
        ctx.fillText("MOVES", movesPanel.x + movesPanel.w / 2, movesPanel.y + 46);
        ctx.strokeText("GOALS", goalsPanel.x + goalsPanel.w / 2, goalsPanel.y + 54);
        ctx.fillText("GOALS", goalsPanel.x + goalsPanel.w / 2, goalsPanel.y + 54);
      }
      ctx.font = "900 76px Georgia, serif";
      ctx.strokeText(this.moves, movesPanel.x + movesPanel.w / 2, movesPanel.y + 114);
      ctx.fillText(this.moves, movesPanel.x + movesPanel.w / 2, movesPanel.y + 114);
      ctx.restore();

      if (!drawImageFit(ctx, deweyImages.sign, sign.x + sign.w / 2, sign.y + sign.h / 2, sign.w, sign.h)) {
        drawWesternPanel(ctx, sign.x, sign.y, sign.w, sign.h, 20);
        ctx.save();
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff0cb";
        ctx.strokeStyle = "#4f260f";
        ctx.lineWidth = 5;
        ctx.font = "900 42px Georgia, serif";
        ctx.strokeText("DEWEY DISORDER", sign.x + sign.w / 2, sign.y + 118);
        ctx.fillText("DEWEY DISORDER", sign.x + sign.w / 2, sign.y + 118);
        ctx.restore();
      }

      for (let i = 0; i < this.goals.length; i += 1) {
        const goal = this.goals[i];
        const slot = this.goalSlotCenter(goal.type);
        const slotX = slot.x;
        const iconY = slot.y;
        this.drawPieceIcon(goal.type, slotX, iconY, 23);
        ctx.save();
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff3cf";
        ctx.strokeStyle = "#4f260f";
        ctx.lineWidth = 5;
        ctx.font = "900 34px Georgia, serif";
        ctx.strokeText(Math.max(0, goal.remaining), slotX, goalsPanel.y + 170);
        ctx.fillText(Math.max(0, goal.remaining), slotX, goalsPanel.y + 170);
        ctx.restore();
      }

      ctx.save();
      ctx.textAlign = "center";
      const visibleScore = Math.max(0, Math.round(this.displayScore));
      const earnedStars = deweyStarThresholds.filter((threshold) => visibleScore >= threshold).length;
      const currentThreshold = deweyStarThresholds[Math.max(0, earnedStars - 1)] ?? 0;
      const nextThreshold = deweyStarThresholds[earnedStars] ?? deweyStarThresholds[deweyStarThresholds.length - 1];
      const maxBarWidth = scorePanel.w - 56;
      const bandSize = Math.max(1, nextThreshold - currentThreshold);
      const bandProgress =
        earnedStars >= deweyStarThresholds.length
          ? 1
          : clamp((visibleScore - currentThreshold) / bandSize, 0, 1);
      const remainingToNext = Math.max(0, nextThreshold - visibleScore);
      for (let i = 0; i < 3; i += 1) {
        ctx.fillStyle = i < earnedStars ? "#ffd44d" : "#3d210f";
        ctx.strokeStyle = "#5b2a0e";
        ctx.lineWidth = 4;
        drawStarShape(ctx, scorePanel.x + 44 + i * 42, scorePanel.y + 42, 21, 10);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = "#fff3cf";
      ctx.strokeStyle = "#4f260f";
      ctx.lineWidth = 5;
      ctx.font = "900 26px Georgia, serif";
      const scoreText = visibleScore.toLocaleString("en-US");
      ctx.strokeText(scoreText, scorePanel.x + scorePanel.w / 2, scorePanel.y + 92);
      ctx.fillText(scoreText, scorePanel.x + scorePanel.w / 2, scorePanel.y + 92);
      roundedRect(ctx, scorePanel.x + 25, scorePanel.y + 118, scorePanel.w - 50, 22, 9);
      ctx.fillStyle = "#2e170a";
      ctx.fill();
      const barFillWidth = maxBarWidth * bandProgress;
      if (barFillWidth > 0) {
        roundedRect(ctx, scorePanel.x + 28, scorePanel.y + 121, Math.max(10, barFillWidth), 16, 7);
        ctx.fillStyle = "#31b7e8";
        ctx.fill();
      }
      ctx.fillStyle = "#fff3cf";
      ctx.strokeStyle = "#4f260f";
      ctx.font = "900 12px Georgia, serif";
      ctx.lineWidth = 3;
      const progressText =
        earnedStars >= deweyStarThresholds.length ? "3 STARS" : `${remainingToNext.toLocaleString("en-US")} TO NEXT`;
      ctx.strokeText(progressText, scorePanel.x + scorePanel.w / 2, scorePanel.y + 135);
      ctx.fillText(progressText, scorePanel.x + scorePanel.w / 2, scorePanel.y + 135);
      ctx.restore();
    },

    drawBoosters() {
      const { ctx } = this;
      const y = this.metrics().boosterY;
      const now = performance.now();
      for (let i = 0; i < 4; i += 1) {
        const { x } = this.boosterSlotCenter(i);
        const isSelected = this.selectedPowerupSlot === i && this.powerupReady(this.powerupSlots[i]);
        const hint = this.optionHintTransform(`slot:${i}`, now);
        ctx.save();
        ctx.translate(x, y + hint.y);
        ctx.scale(hint.scale, hint.scale);
        ctx.shadowColor = isSelected ? "rgba(49, 183, 232, 0.8)" : "rgba(0,0,0,0.35)";
        ctx.shadowBlur = isSelected || hint.scale > 1 ? 24 : 12;
        drawWesternPanel(ctx, -62, -62, 124, 124, 62);
        if (isSelected) {
          ctx.strokeStyle = "#ffd44d";
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.arc(0, 0, 69 + Math.sin(now / 130) * 3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = "rgba(49, 183, 232, 0.92)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, 58, 0, Math.PI * 2);
          ctx.stroke();
        }
        const slot = this.powerupSlots[i];
        if (slot && now >= slot.availableAt) {
          this.drawPieceIcon(slot.type, 0, 0, 31);
        }
        ctx.restore();
      }

      const button = this.freeSwitchButton();
      const hint = this.optionHintTransform("free", now);
      ctx.save();
      ctx.translate(button.x, button.y + hint.y);
      ctx.scale(hint.scale, hint.scale);
      ctx.fillStyle = this.freeSwitches > 0 ? "#2f78a6" : "#5b4630";
      ctx.strokeStyle = this.freeSwitchMode ? "#ffd44d" : "#fff3cf";
      ctx.lineWidth = this.freeSwitchMode ? 8 : 5;
      ctx.beginPath();
      ctx.arc(0, 0, button.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (this.freeSwitchMode) {
        ctx.strokeStyle = "rgba(49, 183, 232, 0.78)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, button.radius + 11, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = this.freeSwitches > 0 ? "#fff3cf" : "rgba(255, 243, 207, 0.55)";
      ctx.strokeStyle = "#17394d";
      ctx.lineWidth = 6;
      ctx.font = "900 46px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText(this.freeSwitches, 0, -4);
      ctx.fillText(this.freeSwitches, 0, -4);
      ctx.font = "900 15px Georgia, serif";
      ctx.lineWidth = 4;
      ctx.fillStyle = "#fff3cf";
      ctx.strokeStyle = "#4f260f";
      ctx.textBaseline = "alphabetic";
      ctx.strokeText("Free Swap", 0, button.radius + 24);
      ctx.fillText("Free Swap", 0, button.radius + 24);
      ctx.restore();
    },

    drawAnimations(now, powerupLayer = false) {
      const { ctx } = this;
      const radius = this.metrics().tile * 0.265;
      for (const animation of this.animations) {
        const movesPowerup = animation.layer
          ? animation.layer === "powerup"
          : Boolean(
              animation.kind === "collectPowerup" ||
                isPowerupType(animation.type) ||
                animation.pieces?.some((piece) => isPowerupType(piece.type)),
            );
        if (movesPowerup !== powerupLayer) continue;

        const rawT = (now - animation.start) / animation.duration;
        if (rawT < 0) continue;
        const t = clamp(rawT, 0, 1);

        if (animation.kind === "swap") {
          let p = easeInOut(t);
          if (!animation.valid) {
            p = t < 0.5 ? easeOut(t * 2) : 1 - easeInOut((t - 0.5) * 2);
          }
          for (const piece of animation.pieces) {
            const from = this.cellCenter(piece.from.col, piece.from.row);
            const to = this.cellCenter(piece.to.col, piece.to.row);
            const x = from.x + (to.x - from.x) * p;
            const y = from.y + (to.y - from.y) * p;
            const scale = animation.valid ? 1 + Math.sin(p * Math.PI) * 0.08 : 1 + Math.sin(t * Math.PI * 2) * 0.04;
            ctx.save();
            this.drawPieceIcon(piece.type, x, y, radius * scale);
            ctx.restore();
          }
        }

        if (animation.kind === "fall") {
          if (rawT >= 1) continue;
          const p = Math.min(1, easeOutBack(t));
          const from = this.cellCenter(animation.from.col, animation.from.row);
          const to = this.cellCenter(animation.to.col, animation.to.row);
          const x = from.x + (to.x - from.x) * p;
          const y = from.y + (to.y - from.y) * p;
          const scale = 0.84 + Math.min(1, t * 2) * 0.16;
          this.drawPieceIcon(animation.type, x, y, radius * scale);
        }

        if (animation.kind === "rowShift") {
          const { x, y, tile, boardSize } = this.metrics();
          const p = easeInOut(t);
          const axis = animation.axis ?? "row";
          ctx.save();
          roundedRect(ctx, x - 8, y - 8, boardSize + 16, boardSize + 16, 10);
          ctx.clip();
          for (const piece of animation.pieces) {
            const from = this.cellCenter(piece.from.col, piece.from.row);
            const shiftX = axis === "row" ? animation.direction * tile * p : 0;
            const shiftY = axis === "col" ? animation.direction * tile * p : 0;
            const drawX = from.x + shiftX;
            const drawY = from.y + shiftY - Math.sin(p * Math.PI) * (axis === "row" ? 5 : 0);
            const scale = 1 + Math.sin(p * Math.PI) * 0.05;
            this.drawPieceIcon(piece.type, drawX, drawY, radius * scale);
            const needsWrap =
              axis === "row"
                ? (animation.direction > 0 && drawX > x + boardSize - tile / 2) ||
                  (animation.direction < 0 && drawX < x + tile / 2)
                : (animation.direction > 0 && drawY > y + boardSize - tile / 2) ||
                  (animation.direction < 0 && drawY < y + tile / 2);
            if (needsWrap) {
              const wrapX = axis === "row" ? drawX - animation.direction * boardSize : drawX;
              const wrapY = axis === "col" ? drawY - animation.direction * boardSize : drawY;
              this.drawPieceIcon(piece.type, wrapX, wrapY, radius * scale);
            }
          }
          ctx.restore();
        }

        if (animation.kind === "organize") {
          const gatherPhase = 0.34;
          let x = animation.x;
          let y = animation.y;
          let scale = 1;
          let alpha = 1;

          if (t < gatherPhase) {
            const p = easeOut(t / gatherPhase);
            x += (animation.gatherX - animation.x) * p;
            y += (animation.gatherY - animation.y) * p;
            scale = 1 - p * 0.08;
          } else {
            const p = easeInOut((t - gatherPhase) / (1 - gatherPhase));
            x = animation.gatherX + (animation.exitX - animation.gatherX) * p;
            y = animation.gatherY + (animation.exitY - animation.gatherY) * p - Math.sin(p * Math.PI) * 18;
            scale = 0.92 - p * 0.18;
            alpha = p > 0.72 ? 1 - (p - 0.72) / 0.28 : 1;
          }

          ctx.save();
          ctx.globalAlpha = clamp(alpha, 0, 1);
          this.drawPieceIcon(animation.type, x, y, radius * scale);
          ctx.restore();
        }

        if (animation.kind === "collectPowerup") {
          const p = easeInOut(t);
          const x = animation.x + (animation.targetX - animation.x) * p;
          const y = animation.y + (animation.targetY - animation.y) * p - Math.sin(p * Math.PI) * 24;
          const scale = 1.12 - p * 0.08 + Math.sin(p * Math.PI) * 0.1;
          ctx.save();
          ctx.globalAlpha = p > 0.9 ? 1 - (p - 0.9) / 0.1 : 1;
          this.drawPieceIcon(animation.type, x, y, radius * scale);
          ctx.restore();
        }

        if (animation.kind === "vanish") {
          const p = easeOut(t);
          ctx.save();
          ctx.globalAlpha = 1 - p;
          this.drawPieceIcon(animation.type, animation.x, animation.y - p * 16, radius * (1 + p * 0.34));
          ctx.restore();
        }

        if (animation.kind === "explode") {
          const p = easeOut(t);
          ctx.save();
          ctx.translate(animation.x + animation.dx * p, animation.y + animation.dy * p);
          ctx.rotate(animation.spin * p);
          ctx.globalAlpha = 1 - p;
          this.drawPieceIcon(animation.type, 0, 0, radius * (1 + p * 0.44));
          ctx.restore();
        }
      }
    },

    drawParticles(now) {
      const { ctx } = this;
      for (const particle of this.particles) {
        const elapsed = now - particle.start;
        if (elapsed < 0) continue;
        const t = clamp(elapsed / particle.duration, 0, 1);
        if (particle.mode === "organize") {
          const p = easeInOut(t);
          const wobble = Math.sin(particle.phase + p * Math.PI * 2.3) * particle.wobble * (1 - t);
          const lift = Math.sin(p * Math.PI) * 20;
          const x = particle.fromX + (particle.toX - particle.fromX) * p + wobble;
          const y = particle.fromY + (particle.toY - particle.fromY) * p - lift;
          const size = particle.size * (1 - t * 0.35);
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(particle.phase + t * Math.PI);
          ctx.globalAlpha = (1 - t) * 0.78;
          ctx.fillStyle = particle.color;
          ctx.strokeStyle = "rgba(255, 246, 198, 0.78)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(size * 0.58, 0);
          ctx.lineTo(0, size);
          ctx.lineTo(-size * 0.58, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          continue;
        }
        const x = particle.x + particle.vx * t;
        const y = particle.y + particle.vy * t + 180 * t * t;
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = particle.color;
        ctx.strokeStyle = "rgba(255, 246, 198, 0.75)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, particle.size * (1 - t * 0.35), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    },

    drawShuffleIntro(now) {
      const { ctx } = this;
      const intro = this.shuffleIntro;
      if (!intro) return;

      const { x, y, boardSize } = this.metrics();
      const t = clamp((now - intro.start) / intro.duration, 0, 1);
      const windAlpha = Math.sin(t * Math.PI);

      ctx.save();
      roundedRect(ctx, x - 8, y - 8, boardSize + 16, boardSize + 16, 10);
      ctx.clip();

      const drawDustMote = (mote, frontLayer) => {
        if (mote.front !== frontLayer) return;
        const vortex = intro.vortices[mote.vortex];
        if (!vortex) return;
        const rawT = (now - intro.start - mote.delay) / mote.duration;
        if (rawT < 0) return;
        const moteT = clamp(rawT, 0, 1);
        const p = easeOut(moteT);
        const fade = Math.sin(moteT * Math.PI);
        const activeCenterX = vortex.x + Math.sin(vortex.phase + t * Math.PI * 4) * 22 * windAlpha;
        const activeCenterY = vortex.y + Math.cos(vortex.phase + t * Math.PI * 3) * 18 * windAlpha;
        const angle = mote.angle + p * Math.PI * 2.6 * mote.speed + now * 0.004 * vortex.spin;
        const radius = mote.radius * (1 - p * 0.44) + Math.sin(mote.phase + p * Math.PI * 5) * 16 * (1 - moteT);
        const moteX = activeCenterX + Math.cos(angle) * radius + mote.driftX * p;
        const moteY = activeCenterY + Math.sin(angle) * radius * mote.yScale + mote.driftY * p;
        const alpha = mote.alpha * fade * (0.72 + windAlpha * 0.38);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "rgba(255, 236, 178, 0.78)";
        ctx.fillStyle = "rgba(246, 206, 129, 0.88)";
        ctx.lineWidth = Math.max(1, mote.size * 0.42);
        if (mote.streak) {
          const tangent = angle + Math.PI / 2;
          const length = mote.length * (0.55 + windAlpha * 0.55);
          ctx.beginPath();
          ctx.moveTo(moteX - Math.cos(tangent) * length * 0.5, moteY - Math.sin(tangent) * length * 0.5);
          ctx.lineTo(moteX + Math.cos(tangent) * length * 0.5, moteY + Math.sin(tangent) * length * 0.5);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(moteX, moteY, mote.size * (1 - moteT * 0.28), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };

      ctx.save();
      ctx.globalAlpha = 0.16 + windAlpha * 0.22;
      ctx.lineCap = "round";
      for (const vortex of intro.vortices) {
        const spin = vortex.phase + now * 0.006 * vortex.spin;
        for (let ring = 0; ring < 3; ring += 1) {
          const radius = vortex.radius * (0.25 + ring * 0.22) * (0.9 + Math.sin(t * Math.PI * 2 + ring) * 0.08);
          const angle = spin + ring * 1.6;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(255, 226, 159, ${0.28 + ring * 0.08})`;
          ctx.lineWidth = 2 + ring * 0.8;
          ctx.ellipse(
            vortex.x + Math.cos(angle) * 10,
            vortex.y + Math.sin(angle) * 8,
            radius,
            radius * 0.34,
            angle * 0.18,
            angle,
            angle + Math.PI * 0.66,
          );
          ctx.stroke();
        }
      }
      ctx.restore();

      for (const mote of intro.motes) {
        drawDustMote(mote, false);
      }

      for (const piece of intro.pieces) {
        const rawT = (now - intro.start - piece.delay) / Math.max(1, intro.duration - piece.delay);
        if (rawT < 0) continue;
        const pieceT = clamp(rawT, 0, 1);
        const settle = easeInOut(pieceT);
        const finalBlend = easeInOut(clamp((pieceT - 0.48) / 0.52, 0, 1));
        const loose = 1 - finalBlend;
        const angle = piece.angle + piece.turns * Math.PI * 2 * easeOut(pieceT);
        const orbitRadius = piece.radius * (1 - settle * 0.62) + Math.sin(piece.phase + pieceT * Math.PI * 5) * piece.wobble * loose;
        const orbitCenterX = intro.center.x + Math.sin(piece.phase + pieceT * Math.PI * 4) * piece.wobble * loose;
        const orbitCenterY = intro.center.y + Math.cos(piece.phase + pieceT * Math.PI * 3) * piece.wobble * 0.65 * loose;
        const gust = Math.sin(pieceT * Math.PI) * loose;
        const orbitX = orbitCenterX + Math.cos(angle) * orbitRadius + piece.gustX * gust;
        const orbitY = orbitCenterY + Math.sin(angle) * orbitRadius * 0.58 + piece.gustY * gust - Math.sin(pieceT * Math.PI) * 42;
        const jitterX = Math.sin(piece.phase + pieceT * Math.PI * 8) * piece.wobble * 0.36 * loose;
        const jitterY = Math.cos(piece.phase + pieceT * Math.PI * 7) * piece.wobble * 0.26 * loose;
        const drawX = orbitX + (piece.finalX - orbitX) * finalBlend + jitterX;
        const drawY = orbitY + (piece.finalY - orbitY) * finalBlend + jitterY;
        const rotation = piece.rotation + piece.spin * loose * Math.PI * (1 + pieceT) + Math.sin(piece.phase + pieceT * Math.PI * 6) * 0.22 * loose;
        const scale = 0.74 + finalBlend * 0.26 + Math.sin(pieceT * Math.PI) * 0.11;
        const alpha = Math.min(1, pieceT / 0.12);

        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(rotation);
        ctx.globalAlpha = alpha;
        this.drawPieceIcon(piece.type, 0, 0, intro.radius * scale);
        ctx.restore();
      }

      for (const mote of intro.motes) {
        drawDustMote(mote, true);
      }

      ctx.restore();
    },

    drawScorePops(now) {
      const { ctx } = this;
      for (const pop of this.scorePops) {
        const t = clamp((now - pop.start) / pop.duration, 0, 1);
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff3cf";
        ctx.strokeStyle = "#6a2d0f";
        ctx.lineWidth = 6;
        ctx.font = "900 34px Georgia, serif";
        ctx.strokeText(pop.text, pop.x, pop.y - 66 * easeOut(t));
        ctx.fillText(pop.text, pop.x, pop.y - 66 * easeOut(t));
        ctx.restore();
      }
    },

    drawEndOverlay(now) {
      const { ctx, canvas } = this;
      const button = this.playAgainButton();
      const panel = {
        x: canvas.width / 2 - 280,
        y: canvas.height / 2 - 270,
        w: 560,
        h: 610,
      };
      const scoreText = Math.round(this.gameOverScore).toLocaleString("en-US");
      const highScoreText = Math.round(this.gameOverHighScore).toLocaleString("en-US");
      const title = this.status === "won" ? "LIST COMPLETE" : "GAME OVER";
      const setFittedFont = (text, maxSize, minSize, maxWidth) => {
        let size = maxSize;
        do {
          ctx.font = `900 ${size}px Georgia, serif`;
          if (ctx.measureText(text).width <= maxWidth || size <= minSize) return;
          size -= 2;
        } while (size >= minSize);
      };
      const drawScoreRow = (label, value, rowY) => {
        roundedRect(ctx, panel.x + 82, rowY, panel.w - 164, 88, 18);
        ctx.fillStyle = "rgba(46, 23, 10, 0.72)";
        ctx.fill();
        ctx.fillStyle = "#fff3cf";
        ctx.strokeStyle = "#4f260f";
        ctx.lineWidth = 5;
        ctx.textBaseline = "middle";
        ctx.font = "900 23px Georgia, serif";
        ctx.strokeText(label, canvas.width / 2, rowY + 27);
        ctx.fillText(label, canvas.width / 2, rowY + 27);
        setFittedFont(value, 36, 26, panel.w - 210);
        ctx.strokeText(value, canvas.width / 2, rowY + 61);
        ctx.fillText(value, canvas.width / 2, rowY + 61);
      };

      ctx.save();
      ctx.fillStyle = "rgba(33, 21, 13, 0.78)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawWesternPanel(ctx, panel.x, panel.y, panel.w, panel.h, 28);

      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd44d";
      ctx.strokeStyle = "#4f260f";
      ctx.lineWidth = 8;
      ctx.textBaseline = "alphabetic";
      setFittedFont(title, 58, 42, panel.w - 86);
      ctx.strokeText(title, canvas.width / 2, panel.y + 98);
      ctx.fillText(title, canvas.width / 2, panel.y + 98);

      const finalStars = deweyStarThresholds.filter((threshold) => Math.round(this.gameOverScore) >= threshold).length;
      for (let i = 0; i < 3; i += 1) {
        const starX = canvas.width / 2 - 92 + i * 92;
        ctx.fillStyle = i < finalStars ? "#ffd44d" : "#3d210f";
        ctx.strokeStyle = "#5b2a0e";
        ctx.lineWidth = 5;
        drawStarShape(ctx, starX, panel.y + 154, 27 + Math.sin(now / 260 + i) * 2, 13);
        ctx.fill();
        ctx.stroke();
      }

      drawScoreRow("SCORE", scoreText, panel.y + 206);
      drawScoreRow("HIGH SCORE", highScoreText, panel.y + 322);

      ctx.save();
      ctx.translate(button.x + button.w / 2, button.y + button.h / 2);
      const pulse = 1 + Math.sin(now / 220) * 0.018;
      ctx.scale(pulse, pulse);
      drawWesternPanel(ctx, -button.w / 2, -button.h / 2, button.w, button.h, 24);
      ctx.fillStyle = "#31b7e8";
      roundedRect(ctx, -button.w / 2 + 12, -button.h / 2 + 12, button.w - 24, button.h - 24, 18);
      ctx.fill();
      ctx.strokeStyle = "#fff3cf";
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.fillStyle = "#fff3cf";
      ctx.beginPath();
      ctx.moveTo(-122, -15);
      ctx.lineTo(-122, 15);
      ctx.lineTo(-94, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#17394d";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = "#fff3cf";
      ctx.strokeStyle = "#17394d";
      ctx.lineWidth = 5;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      setFittedFont("PLAY AGAIN", 29, 23, button.w - 142);
      ctx.strokeText("PLAY AGAIN", 34, 1);
      ctx.fillText("PLAY AGAIN", 34, 1);
      ctx.restore();

      ctx.restore();
    },

    draw(activeMatches = this.activeMatches) {
      const { ctx, canvas } = this;
      const now = performance.now();
      this.updateEffects(now);
      const { x, y, tile, boardSize } = this.metrics();
      const shuffleActive = this.shuffleIntro && now < this.shuffleIntro.start + this.shuffleIntro.duration;
      const fallingTargets = new Set();
      for (const animation of this.animations) {
        if (animation.kind === "fall" && now < animation.start + animation.duration) {
          fallingTargets.add(cellKey(animation.to.col, animation.to.row));
        }
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.drawBackground();
      this.drawPanel();

      drawWesternPanel(ctx, x - 22, y - 24, boardSize + 44, boardSize + 46, 16);
      roundedRect(ctx, x - 8, y - 8, boardSize + 16, boardSize + 16, 10);
      ctx.fillStyle = "rgba(42, 35, 27, 0.9)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 201, 101, 0.6)";
      ctx.lineWidth = 4;
      ctx.stroke();

      for (let row = 0; row < this.size; row += 1) {
        for (let col = 0; col < this.size; col += 1) {
          const cellX = x + col * tile;
          const cellY = y + row * tile;
          roundedRect(ctx, cellX + 3, cellY + 3, tile - 6, tile - 6, 9);
          ctx.fillStyle = (row + col) % 2 === 0 ? "rgba(28, 25, 21, 0.8)" : "rgba(54, 44, 34, 0.82)";
          ctx.fill();
          ctx.strokeStyle = "rgba(117, 92, 59, 0.5)";
          ctx.lineWidth = 2;
          ctx.stroke();

          const key = cellKey(col, row);
          if (activeMatches.has(key)) {
            ctx.fillStyle = "rgba(255, 216, 74, 0.45)";
            ctx.fill();
          }

          const value = this.board[row][col];
          if (value >= 0 && !this.hiddenCells.has(key) && !shuffleActive && !fallingTargets.has(key)) {
            this.drawPieceIcon(value, cellX + tile / 2, cellY + tile / 2, tile * 0.265);
          }
        }
      }

      if (shuffleActive) {
        this.drawShuffleIntro(now);
      }
      this.drawAnimations(now, false);
      this.drawParticles(now);

      if (this.selected) {
        ctx.save();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 4;
        roundedRect(
          ctx,
          x + this.selected.col * tile + 5,
          y + this.selected.row * tile + 5,
          tile - 10,
          tile - 10,
          8,
        );
        ctx.stroke();
        ctx.restore();
      }

      if (this.freeSwitchSelected) {
        ctx.save();
        ctx.strokeStyle = "#31b7e8";
        ctx.lineWidth = 6;
        roundedRect(
          ctx,
          x + this.freeSwitchSelected.col * tile + 5,
          y + this.freeSwitchSelected.row * tile + 5,
          tile - 10,
          tile - 10,
          8,
        );
        ctx.stroke();
        ctx.strokeStyle = "#ffd44d";
        ctx.lineWidth = 2;
        roundedRect(
          ctx,
          x + this.freeSwitchSelected.col * tile + 12,
          y + this.freeSwitchSelected.row * tile + 12,
          tile - 24,
          tile - 24,
          6,
        );
        ctx.stroke();
        ctx.restore();
      }

      this.drawBoosters();
      this.drawAnimations(now, true);
      this.drawScorePops(now);

      if (this.status === "won" || this.status === "lost") {
        this.drawEndOverlay(now);
      }
    },
  };

  function launchGame(game) {
    activeGame = game;
    shell.classList.add("is-opening");
    shell.dataset.screen = game;

    if (game === "centipede") centipede.reset();
    if (game === "candy") candy.reset();

    window.setTimeout(() => shell.classList.remove("is-opening"), 900);
  }

  function backToMenu() {
    activeGame = null;
    shell.classList.remove("is-opening");
    shell.dataset.screen = "menu";
  }

  function restartActiveGame() {
    if (activeGame === "centipede") centipede.reset();
    if (activeGame === "candy") candy.reset();
  }

  document.querySelectorAll("[data-game]").forEach((button) => {
    button.addEventListener("click", () => launchGame(button.dataset.game));
  });
  backButton.addEventListener("click", backToMenu);
  restartButton.addEventListener("click", restartActiveGame);

  centipede.canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (centipede.state === "intro") {
      if (centipede.isIntroButtonEvent(event)) {
        centipede.startFirstWave();
      }
      return;
    }
    centipede.canvas.setPointerCapture(event.pointerId);
    centipede.updatePointer(event);
    centipede.isFiring = true;
    centipede.fire();
  });

  centipede.canvas.addEventListener("pointermove", (event) => {
    event.preventDefault();
    if (centipede.state === "intro") return;
    centipede.updatePointer(event);
  });

  centipede.canvas.addEventListener("pointerup", (event) => {
    event.preventDefault();
    centipede.isFiring = false;
  });

  centipede.canvas.addEventListener("pointercancel", () => {
    centipede.isFiring = false;
  });

  candy.canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (candy.status !== "playing") {
      if (candy.isPlayAgainButtonEvent(event)) {
        candy.reset({ resetScore: true });
      }
      return;
    }
    if (candy.isFreeSwitchButtonEvent(event)) {
      candy.toggleFreeSwitchMode();
      return;
    }
    const powerupSlot = candy.powerupSlotFromEvent(event);
    if (powerupSlot >= 0) {
      candy.selectPowerupSlot(powerupSlot);
      return;
    }
    const cell = candy.cellFromEvent(event);
    if (!cell || candy.busy) return;
    if (candy.selectedPowerupType() === tntType) {
      candy.handleTap(cell);
      return;
    }
    if (candy.freeSwitchMode) {
      candy.handleFreeSwitchCell(cell);
      return;
    }
    candy.canvas.setPointerCapture(event.pointerId);
    candy.pointerDown = cell;
  });

  candy.canvas.addEventListener("pointermove", (event) => {
    if (!candy.pointerDown || candy.busy || candy.status !== "playing" || candy.freeSwitchMode) return;
    event.preventDefault();
    const cell = candy.cellFromEvent(event);
    if (cell && candy.isAdjacent(candy.pointerDown, cell)) {
      if (candy.trySwap(candy.pointerDown, cell) !== false) {
        candy.pointerDown = null;
      }
    }
  });

  candy.canvas.addEventListener("pointerup", (event) => {
    if (!candy.pointerDown || candy.busy) return;
    event.preventDefault();
    const cell = candy.cellFromEvent(event);
    if (cell) {
      if (candy.isAdjacent(candy.pointerDown, cell)) {
        candy.trySwap(candy.pointerDown, cell);
      } else {
        candy.handleTap(cell);
      }
    }
    candy.pointerDown = null;
  });

  candy.canvas.addEventListener("pointercancel", () => {
    candy.pointerDown = null;
  });

  function tick(now) {
    const dt = Math.min(0.04, (now - lastFrame) / 1000);
    lastFrame = now;
    if (activeGame === "centipede") centipede.update(dt);
    if (activeGame === "candy") candy.draw();
    requestAnimationFrame(tick);
  }

  drawBookwormMenuPreview();
  centipede.reset();
  candy.reset({ resetScore: true });
  requestAnimationFrame(tick);
})();
