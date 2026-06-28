export class FXPreview {
  constructor(root) {
    this.root = root;
  }

  render(asset) {
    const container = this.root.querySelector("[data-preview]");
    if (!container) return;

    if (!asset) {
      container.innerHTML = `<div class="fx-browser-preview-empty">${game.i18n.localize("fx-browser.preview.empty")}</div>`;
      return;
    }

    container.innerHTML = `
      <div class="fx-browser-preview-stage">
        <video src="${asset.path}" autoplay loop muted playsinline></video>
      </div>
      <div class="fx-browser-preview-actions">
        <button type="button" data-preview-action="play">${game.i18n.localize("fx-browser.preview.playPause")}</button>
        <button type="button" data-preview-action="restart">${game.i18n.localize("fx-browser.preview.restart")}</button>
      </div>
      <dl class="fx-browser-preview-meta">
        <dt>${game.i18n.localize("fx-browser.preview.file")}</dt><dd>${asset.fileName}</dd>
        <dt>${game.i18n.localize("fx-browser.preview.category")}</dt><dd>${asset.categoryLabel}</dd>
        <dt>${game.i18n.localize("fx-browser.preview.playback")}</dt><dd>${asset.playback}</dd>
        <dt>${game.i18n.localize("fx-browser.preview.path")}</dt><dd title="${asset.path}">${asset.path}</dd>
      </dl>
    `;
  }

  activateListeners() {
    this.root.addEventListener("click", (event) => {
      const action = event.target.closest("[data-preview-action]")?.dataset.previewAction;
      if (!action) return;

      const video = this.root.querySelector("[data-preview] video");
      if (!video) return;

      if (action === "play") {
        if (video.paused) video.play();
        else video.pause();
      }

      if (action === "restart") {
        video.currentTime = 0;
        video.play();
      }
    });
  }
}
