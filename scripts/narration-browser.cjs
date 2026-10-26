// Run against a local server with Playwright available via node_modules or NODE_PATH.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: process.env.TEST_BROWSER || 'chrome', headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  try {
    const context = await browser.newContext({ permissions: ['microphone'] });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.TEST_URL || 'http://localhost:3100');
    await page.getByText('Drop a screen recording here.').waitFor();
    await page.evaluate(async () => {
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1d4433'; ctx.fillRect(0, 0, 320, 180);
      ctx.fillStyle = 'white'; ctx.font = '20px sans-serif'; ctx.fillText('Form screen', 25, 80);
      const stream = canvas.captureStream(10);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = []; recorder.ondataavailable = e => chunks.push(e.data);
      const done = new Promise(resolve => recorder.onstop = resolve);
      recorder.start();
      await new Promise(resolve => setTimeout(resolve, 2000));
      ctx.fillStyle = '#334466'; ctx.fillRect(0, 0, 320, 180); ctx.fillStyle = 'white'; ctx.fillText('Results screen', 25, 80);
      await new Promise(resolve => setTimeout(resolve, 2000));
      recorder.stop(); await done; stream.getTracks().forEach(track => track.stop());
      const wav = frequency => {
        const samples = 24000; const buffer = new ArrayBuffer(44 + samples * 2); const view = new DataView(buffer);
        const text = (o, s) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
        text(0, 'RIFF'); view.setUint32(4, 36 + samples * 2, true); text(8, 'WAVE'); text(12, 'fmt ');
        view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
        view.setUint32(24, 48000, true); view.setUint32(28, 96000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
        text(36, 'data'); view.setUint32(40, samples * 2, true);
        for (let i = 0; i < samples; i++) view.setInt16(44 + i * 2, Math.sin(2 * Math.PI * frequency * i / 48000) * 8000, true);
        return new Blob([buffer], { type: 'audio/wav' });
      };
      const scenes = [{ id: 'a', startSeconds: 0, seconds: 2, spokenLine: 'Fill the form.', caption: 'Form', description: '', visualDescription: 'A form is shown.', covers: [] }, { id: 'b', startSeconds: 2, seconds: 2, spokenLine: 'View the results.', caption: 'Results', description: '', visualDescription: 'Results are shown.', covers: [] }];
      const takes = scenes.map((s, i) => [s.id, { blob: wav(i ? 880 : 440), spokenLine: s.spokenLine, durationSeconds: .5, source: 'voice', status: 'too-short', wpm: 120, wpmOutOfRange: false }]);
      const session = { recording: { blob: new Blob(chunks, { type: 'video/webm' }), mimeType: 'video/webm', durationSeconds: 4, posterDataUrl: canvas.toDataURL(), createdAt: Date.now() }, scenes, takes, criteria: [], rubric: '', preset: 'portfolio', narrator: 'i' };
      const db = await new Promise((resolve, reject) => { const request = indexedDB.open('demoscript', 1); request.onupgradeneeded = () => request.result.createObjectStore('session'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      await new Promise((resolve, reject) => { const tx = db.transaction('session', 'readwrite'); tx.objectStore('session').put(session, 'current'); tx.oncomplete = resolve; tx.onabort = () => reject(tx.error); }); db.close();
    });
    await page.reload();
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.getByText('2 of 2 ready').waitFor();
    await page.getByText('Separate files', { exact: true }).click();
    await page.getByRole('button', { name: 'Build aligned narration' }).click();
    const download = page.getByRole('link', { name: 'Download aligned narration WAV' }); await download.waitFor();
    const details = await download.evaluate(async link => {
      const bytes = await (await fetch(link.href)).arrayBuffer(); const view = new DataView(bytes);
      return { samples: view.getUint32(40, true) / 2, rate: view.getUint32(24, true), gap: view.getInt16(44 + 48000 * 2, true), secondTake: view.getInt16(44 + (96000 + 10) * 2, true) };
    });
    assert.equal(details.samples, 192000); assert.equal(details.rate, 48000); assert.equal(details.gap, 0); assert.notEqual(details.secondTake, 0);
    const preview = page.locator('video[controls]');
    await preview.evaluate(video => { video.currentTime = 2.2; });
    await page.waitForFunction(() => { const video = document.querySelector('video[controls]'); const audio = document.querySelector('audio'); return audio && Math.abs(audio.currentTime - video.currentTime) < .15; });
    await page.getByRole('button', { name: 'Rehearse', exact: true }).click();
    await page.locator('video').evaluate(video => { video.currentTime = 2.2; });
    await page.getByText('Rehearsal · scene 2 of 2').waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.getByText('2 of 2 ready').waitFor();
    await page.getByRole('button', { name: 'Script', exact: true }).click();
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    await page.getByRole('textbox', { name: 'Spoken line for scene 1' }).fill('Changed words.');
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.getByText('Script changed — re-record this take before exporting. Your previous audio is kept.').waitFor();
    await page.getByText('Separate files', { exact: true }).click();
    await page.getByRole('button', { name: 'Build aligned narration' }).click();
    await page.getByRole('alert').filter({ hasText: 'Scene 1 has changed' }).waitFor();
    // A pending mic request and a running take must prevent mode changes.
    await page.getByRole('checkbox').uncheck();
    await page.getByRole('button', { name: 'Re-record', exact: true }).first().click();
    await page.getByRole('button', { name: 'Stop and keep' }).waitFor();
    await page.getByRole('button', { name: 'Script', exact: true }).click();
    await page.getByText('Finish or cancel narration or export before switching modes.').waitFor();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByText('2 of 2 ready').waitFor();
    await page.getByRole('button', { name: 'Re-record', exact: true }).first().click();
    await page.getByRole('button', { name: 'Stop and keep' }).waitFor();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Stop and keep' }).click();
    await page.getByText('Script changed — re-record this take before exporting. Your previous audio is kept.').waitFor({ state: 'hidden' });
    await page.getByText('Narration saved in this browser.').waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.getByText('2 of 2 ready').waitFor();
    assert.equal(await page.getByText('Script changed — re-record this take before exporting. Your previous audio is kept.').count(), 0);
    await page.getByText('Separate files', { exact: true }).click();
    await page.getByRole('button', { name: 'Build aligned narration' }).click();
    await page.getByRole('link', { name: 'Download aligned narration WAV' }).waitFor();
    await page.getByRole('button', { name: 'Create video with narration', exact: true }).click();
    const finishedVideo = page.getByRole('link', { name: /Download video with narration/ });
    await finishedVideo.waitFor({ timeout: 60000 });
    const [finishedDownload] = await Promise.all([page.waitForEvent('download'), finishedVideo.click()]);
    const savedVideo = await finishedDownload.path();
    const { Input, BlobSource, ALL_FORMATS } = await import('mediabunny');
    const media = new Input({ source: new BlobSource(new Blob([require('node:fs').readFileSync(savedVideo)])), formats: ALL_FORMATS });
    try {
      assert.ok(await media.getPrimaryVideoTrack());
      assert.equal((await media.getAudioTracks()).length, 1);
      assert.ok(Math.abs(await media.computeDuration() - 4) < .15);
    } finally { media.dispose(); }
    // Simulate unavailable/full storage and verify protection survives mode changes.
    await page.addInitScript(() => {
      const transaction = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function(names, mode, options) {
        if (mode === 'readwrite') throw new DOMException('Disk full', 'QuotaExceededError');
        return transaction.call(this, names, mode, options);
      };
    });
    await page.reload();
    await page.getByText('Your latest work could not be saved. Keep this page open and retry before leaving.').waitFor();
    for (const mode of ['Rehearse', 'Record', 'Script']) {
      await page.getByRole('button', { name: mode, exact: true }).click();
      assert.equal(await page.evaluate(() => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; }), true);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: browser audio decoding/WAV export, silent gaps, preview seeking, video-clock rehearsal, reload persistence, stale-script refusal, recording mode protection, and saving/exporting a real MediaRecorder take with a simulated microphone.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
