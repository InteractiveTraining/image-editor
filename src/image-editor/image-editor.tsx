import { Component, Element, Event, EventEmitter, h, Host, Listen, Prop, State } from '@stencil/core';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

@Component({
  tag: 'it-image-editor',
  styleUrl: 'image-editor.scss',
  shadow: true
})
export class ImageEditor {
  private imageEl: HTMLImageElement;
  private fileInput: HTMLIonInputElement;

  @Element() el: HTMLElement;
  @Prop({ mutable: true }) src: string;
  @State() cropper: Cropper;

  @State() fileName: string;
  @State() flipHorizontal: boolean = false;
  @State() flipVertical: boolean = false;
  @State() width: number;
  @State() height: number;
  @State() x: number;
  @State() y: number;

  @State() base64: any;

  /**
   * Emitted when the save button is clicked.
   */
  @Event() save: EventEmitter<{ base64: string, name: string }>;

  componentDidLoad() {
    this.setImageSrc(this.src);
  }

  private async setImageSrc(src: string) {
    if (!src) return;

    this.src = src;
    this.imageEl.src = src;

    if (this.cropper) {
      this.cropper.destroy();
    }

    this.cropper = new Cropper(this.imageEl, {
      viewMode: 1,
      movable: true,
      dragMode: "move",
      //aspectRatio: 16 / 9,
      crop(event) {
        document.dispatchEvent(new CustomEvent('cropperEvent', {
          bubbles: true,
          detail: {}
        }));
      },
    });

    window['cropper'] = this.cropper;
  }

  @Listen('cropperEvent', { target: "window" })
  onCrop() {
    let data = this.cropper.getData();
    this.width = Math.floor(data.width);
    this.height = Math.floor(data.height);
    this.x = Math.floor(data.x);
    this.y = Math.floor(data.y);
    this.base64 = this.cropper.getCroppedCanvas().toDataURL();
  }

  private selectImage() {
    const inputEl: HTMLInputElement = this.fileInput.querySelector('input');
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      this.fileName = inputEl.files[0].name;
      this.setImageSrc(reader.result.toString());
    }, false);
    reader.readAsDataURL(inputEl.files[0]);
  }

  private async saveCrop() {
    this.save.emit({
      base64: this.cropper.getCroppedCanvas().toDataURL(),
      name: this.fileName
    });
  }

  private async flip(type: 'vertical' | 'horizontal') {
    let left = this.flipHorizontal ? -1 : 1;
    let right = this.flipVertical ? -1 : 1;

    if (this.flipHorizontal && type === 'horizontal') {
      left = 1;
      this.flipHorizontal = false;
    } else if (type === 'horizontal') {
      left = -1;
      this.flipHorizontal = true;
    }


    if (this.flipVertical && type === 'vertical') {
      right = 1;
      this.flipVertical = false;
    } else if (type === 'vertical') {
      right = -1;
      this.flipVertical = true;
    }

    this.cropper.scale(left, right);
  }

  render() {
    return <Host>
      <div class={'image-editor-container'}>
        <div class={'original-image-container'}>
          <img ref={el => this.imageEl = el as HTMLImageElement} />
        </div>
        <div>
          <ion-header>
            <ion-toolbar color={'dark'}>
              <ion-title>{this.fileName}</ion-title>
              {(this.src) && <ion-buttons slot="end">
                <ion-button icon-only color="secondary" title={'Save'} onClick={() => this.saveCrop()}
                  disabled={!this.src}>
                  <ion-icon name="checkmark" size="large" />
                </ion-button>
              </ion-buttons>}
            </ion-toolbar>
          </ion-header>
          <ion-content>

            <ion-list lines={'full'}>

              <ion-item color={'dark'}>
                <ion-label position={'fixed'}>Image</ion-label>
                <ion-input name="file"
                  ref={el => this.fileInput = el as HTMLIonInputElement}
                  type={"file" as "text"}
                  inputmode={"file" as "text"}
                  onChange={() => this.selectImage()}
                  spellcheck={false}
                  autocapitalize={'none'}
                  autocomplete={'off'}
                  autocorrect={'off'}
                  required />
              </ion-item>

              {(this.src) && <ion-item class={'settings-nav'}>
                <ion-label>
                  <ion-tab-bar color={'dark'}>

                    <ion-tab-button
                      title={'Rotate'}
                      onClick={() => this.cropper.rotate(90)}
                      disabled={!this.src}><ion-icon name="repeat" /> Rotate</ion-tab-button>

                    <ion-tab-button
                      title={'Flip horizontally'}
                      onClick={() => this.flip('horizontal')}
                      disabled={!this.src}><ion-icon name="caret-back" /> Flip horizontally</ion-tab-button>

                    <ion-tab-button
                      title={'Flip vertically'}
                      onClick={() => this.flip('vertical')}
                      disabled={!this.src}><ion-icon name="caret-up" /> Flip vertically</ion-tab-button>

                    <ion-tab-button
                      title={'Zoom In'}
                      onClick={() => this.cropper.zoom(0.01)}
                      disabled={!this.src}><ion-icon src={'https://raw.githubusercontent.com/FortAwesome/Font-Awesome/master/svgs/solid/search-plus.svg'} /> Zoom In</ion-tab-button>

                    <ion-tab-button
                      title={'Zoom Out'}
                      onClick={() => this.cropper.zoom(-0.01)}
                      disabled={!this.src}><ion-icon src={'https://raw.githubusercontent.com/FortAwesome/Font-Awesome/master/svgs/solid/search-minus.svg'} /> Zoom Out</ion-tab-button>

                  </ion-tab-bar>
                </ion-label>
              </ion-item>}

            </ion-list>

            <ion-list lines={'full'} class="img-info">
              {(this.base64) && <img src={this.base64} style={{ 'width': '100%', 'height': 'auto' }} />}

              {(typeof this.width !== "undefined") && <ion-item color={'dark'}>
                <ion-label>Width</ion-label>
                <ion-badge slot="end" color="light">{this.width}</ion-badge>
              </ion-item>}

              {(typeof this.height !== "undefined") && <ion-item color={'dark'}>
                <ion-label>Height</ion-label>
                <ion-badge slot="end" color="light">{this.height}</ion-badge>
              </ion-item>}

              {(typeof this.x !== "undefined") && <ion-item color={'dark'}>
                <ion-label>X</ion-label>
                <ion-badge slot="end" color="light">{this.x}</ion-badge>
              </ion-item>}

              {(typeof this.y !== "undefined") && <ion-item color={'dark'}>
                <ion-label>Y</ion-label>
                <ion-badge slot="end" color="light">{this.y}</ion-badge>
              </ion-item>}
            </ion-list>
          </ion-content>
        </div>
      </div>
    </Host>;
  }
}
