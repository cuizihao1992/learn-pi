const logElement = document.querySelector('#event-log');
const logLines = [];

function writeLog(message) {
  logLines.unshift(`${new Date().toLocaleTimeString()}  ${message}`);
  logElement.textContent = logLines.slice(0, 12).join('\n');
}

async function start() {
  try {
    const maplibregl = await import('https://unpkg.com/maplibre-gl@6.9.0/dist/maplibre-gl.mjs');
    const route = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        id: 'beijing-route',
        properties: {kind: 'primary', name: '教学路线'},
        geometry: {
          type: 'LineString',
          coordinates: [[116.31, 39.89], [116.35, 39.93], [116.40, 39.90], [116.46, 39.95]],
        },
      }],
    };

    const map = new maplibregl.Map({
      container: 'map',
      center: [116.385, 39.92],
      zoom: 10.5,
      style: {
        version: 8,
        sources: {route: {type: 'geojson', data: route}},
        layers: [
          {id: 'background', type: 'background', paint: {'background-color': '#edf2f4'}},
          {
            id: 'route-line',
            type: 'line',
            source: 'route',
            filter: ['==', ['get', 'kind'], 'primary'],
            layout: {'line-cap': 'round', 'line-join': 'round'},
            paint: {'line-color': '#087f72', 'line-width': 8, 'line-opacity': 0.92},
          },
        ],
      },
    });

    map.addControl(new maplibregl.NavigationControl({showCompass: false}), 'top-right');
    map.on('load', () => writeLog('load: Style、Source 和首帧可用'));
    map.on('idle', () => writeLog('idle: 当前没有待加载 tile 或待绘制变化'));
    map.on('error', event => writeLog(`error: ${event.error?.message || 'unknown'}`));
    map.on('click', event => {
      const features = map.queryRenderedFeatures(event.point, {layers: ['route-line']});
      writeLog(`queryRenderedFeatures: ${features.length} 个命中`);
    });

    document.querySelector('#layer-visible').addEventListener('change', event => {
      map.setLayoutProperty('route-line', 'visibility', event.target.checked ? 'visible' : 'none');
      writeLog(`layout.visibility = ${event.target.checked ? 'visible' : 'none'}`);
    });
    document.querySelector('#filter-match').addEventListener('change', event => {
      const expected = event.target.checked ? 'primary' : 'missing';
      map.setFilter('route-line', ['==', ['get', 'kind'], expected]);
      writeLog(`filter kind == ${expected}`);
    });
    document.querySelector('#wide-line').addEventListener('change', event => {
      map.setPaintProperty('route-line', 'line-width', event.target.checked ? 18 : 8);
      writeLog(`paint.line-width = ${event.target.checked ? 18 : 8}`);
    });
    document.querySelector('#show-tiles').addEventListener('change', event => {
      map.showTileBoundaries = event.target.checked;
      writeLog(`showTileBoundaries = ${event.target.checked}`);
    });
  } catch (error) {
    writeLog(`加载失败: ${error.message}`);
  }
}

start();
