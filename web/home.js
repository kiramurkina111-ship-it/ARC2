const canvas = document.getElementById("settlementCanvas");
const context = canvas.getContext("2d");
const nodes = [
  { x: 0.58, y: 0.36, label: "USER" },
  { x: 0.72, y: 0.22, label: "VAULT" },
  { x: 0.86, y: 0.38, label: "POLICY" },
  { x: 0.78, y: 0.62, label: "ARC" },
  { x: 0.93, y: 0.72, label: "API" },
];

function resize() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(canvas.clientWidth * ratio);
  canvas.height = Math.floor(canvas.clientHeight * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function draw(time) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "rgba(6, 17, 29, 0.55)";
  context.fillRect(0, 0, width, height);

  const textSafeWidth = width > 900 ? Math.min(width * 0.54, 760) : 0;

  context.strokeStyle = "rgba(188, 236, 255, 0.08)";
  context.lineWidth = 1;
  for (let x = 0; x < width; x += 56) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y < height; y += 56) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  const points = nodes.map((node) => ({ ...node, px: node.x * width, py: node.y * height }));

  context.lineWidth = 1.4;
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const pulse = (Math.sin(time / 600 + index) + 1) / 2;

    context.strokeStyle = "rgba(66, 215, 255, 0.38)";
    context.beginPath();
    context.moveTo(from.px, from.py);
    context.lineTo(to.px, to.py);
    context.stroke();

    context.fillStyle = "rgba(188, 236, 255, 0.9)";
    context.beginPath();
    context.arc(from.px + (to.px - from.px) * pulse, from.py + (to.py - from.py) * pulse, 3, 0, Math.PI * 2);
    context.fill();
  }

  points.forEach((point) => {
    if (point.px < textSafeWidth) return;

    context.fillStyle = "rgba(6, 17, 29, 0.95)";
    context.strokeStyle = "rgba(188, 236, 255, 0.72)";
    context.lineWidth = 1;
    context.beginPath();
    context.rect(point.px - 28, point.py - 18, 56, 36);
    context.fill();
    context.stroke();

    context.fillStyle = "#bcecff";
    context.font = "11px Consolas, monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(point.label, point.px, point.py);
  });

  requestAnimationFrame(draw);
}

resize();
window.addEventListener("resize", resize);
requestAnimationFrame(draw);
