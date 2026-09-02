/// <reference types="@sveltejs/kit" />
// Service worker minimo: tiene in cache solo i file dell'applicazione (script,
// stili, icone), mai le pagine. Le pagine dipendono da chi ha fatto l'accesso e
// da quanto hai speso: servirle da una copia vecchia sarebbe peggio che non
// servirle affatto.
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `cash-bowl-${version}`;
const ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
	sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	const isAsset = event.request.method === 'GET' && ASSETS.includes(url.pathname);
	if (!isAsset) return;

	event.respondWith(caches.match(event.request).then((hit) => hit ?? fetch(event.request)));
});
