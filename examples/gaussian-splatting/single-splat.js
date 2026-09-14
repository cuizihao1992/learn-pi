const canvas = document.querySelector('#splat-canvas');
const context = canvas.getContext('2d');
const controls = {
  sigmaX: document.querySelector('#sigma-x'),
  sigmaY: document.querySelector('#sigma-y'),
  rotation: document.querySelector('#rotation'),
  opacity: document.querySelector('#opacity'),
  sampleX: document.querySelector('#sample-x'),
  sampleY: document.querySelector('#sample-y'),
};

const outputs = {
  sigmaX: document.querySelector('#sigma-x-value'),
  sigmaY: document.querySelector('#sigma-y-value'),
  rotation: document.querySelector('#rotation-value'),
  opacity: document.querySelector('#opacity-value'),
  sampleX: document.querySelector('#sample-x-value'),
  sampleY: document.querySelector('#sample-y-value'),
  covariance: document.querySelector('#covariance'),
  mahalanobis: document.querySelector('#mahalanobis'),
  weight: document.querySelector('#weight'),
  alpha: document.querySelector('#alpha'),
  color: document.querySelector('#color'),
};

const gaussianColor = [232 / 255, 55 / 255, 50 / 255];
const background = [21 / 255, 32 / 255, 42 / 255];

function parameters() {
  return {
    sigmaX: Number(controls.sigmaX.value),
    sigmaY: Number(controls.sigmaY.value),
    rotation: Number(controls.rotation.value) * Math.PI / 180,
    opacity: Number(controls.opacity.value) / 100,
    sampleX: Number(controls.sampleX.value),
    sampleY: Number(controls.sampleY.value),
  };
}

function covariance({sigmaX, sigmaY, rotation}) {
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  const xx = c * c * sigmaX * sigmaX + s * s * sigmaY * sigmaY;
  const xy = c * s * (sigmaX * sigmaX - sigmaY * sigmaY);
  const yy = s * s * sigmaX * sigmaX + c * c * sigmaY * sigmaY;
  return {xx, xy, yy};
}

function sample(dx, dy, cov, opacity) {
  const det = cov.xx * cov.yy - cov.xy * cov.xy;
  const invXX = cov.yy / det;
  const invXY = -cov.xy / det;
  const invYY = cov.xx / det;
  const mahalanobis = invXX * dx * dx + 2 * invXY * dx * dy + invYY * dy * dy;
  const weight = Math.exp(-0.5 * mahalanobis);
  const alpha = Math.min(0.99, opacity * weight);
  const color = gaussianColor.map((channel, index) => alpha * channel + (1 - alpha) * background[index]);
  return {mahalanobis, weight, alpha, color};
}

function draw() {
  const params = parameters();
  const cov = covariance(params);
  const image = context.createImageData(canvas.width, canvas.height);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const result = sample(x - centerX, y - centerY, cov, params.opacity);
      const offset = (y * canvas.width + x) * 4;
      image.data[offset] = Math.round(result.color[0] * 255);
      image.data[offset + 1] = Math.round(result.color[1] * 255);
      image.data[offset + 2] = Math.round(result.color[2] * 255);
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);

  const sampleX = centerX + params.sampleX;
  const sampleY = centerY + params.sampleY;
  context.strokeStyle = '#ffffff';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(sampleX - 9, sampleY);
  context.lineTo(sampleX + 9, sampleY);
  context.moveTo(sampleX, sampleY - 9);
  context.lineTo(sampleX, sampleY + 9);
  context.stroke();

  context.strokeStyle = 'rgba(255,255,255,.72)';
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(centerX, centerY, 3, 0, Math.PI * 2);
  context.stroke();

  const result = sample(params.sampleX, params.sampleY, cov, params.opacity);
  outputs.sigmaX.value = `${params.sigmaX.toFixed(0)} px`;
  outputs.sigmaY.value = `${params.sigmaY.toFixed(0)} px`;
  outputs.rotation.value = `${(params.rotation * 180 / Math.PI).toFixed(0)}°`;
  outputs.opacity.value = params.opacity.toFixed(2);
  outputs.sampleX.value = `${params.sampleX.toFixed(0)} px`;
  outputs.sampleY.value = `${params.sampleY.toFixed(0)} px`;
  outputs.covariance.textContent = `[[${cov.xx.toFixed(1)}, ${cov.xy.toFixed(1)}], [${cov.xy.toFixed(1)}, ${cov.yy.toFixed(1)}]]`;
  outputs.mahalanobis.textContent = result.mahalanobis.toFixed(4);
  outputs.weight.textContent = result.weight.toFixed(4);
  outputs.alpha.textContent = result.alpha.toFixed(4);
  outputs.color.textContent = `(${result.color.map(value => value.toFixed(3)).join(', ')})`;
}

Object.values(controls).forEach(control => control.addEventListener('input', draw));
draw();
