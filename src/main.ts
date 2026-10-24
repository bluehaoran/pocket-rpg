import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/atkinson-hyperlegible/latin-400';
import '@fontsource/atkinson-hyperlegible/latin-700';
import '@fontsource/big-shoulders-display/latin-700';
import '@fontsource/big-shoulders-display/latin-800';
import '@fontsource/jetbrains-mono/latin-500';
import '@fontsource/jetbrains-mono/latin-700';
import './app.css';
import App from './App.svelte';
import { bindLifecycle, initSession } from './lib/session.svelte.ts';

registerSW({ immediate: true });

bindLifecycle();
void initSession();

export default mount(App, { target: document.getElementById('app')! });
