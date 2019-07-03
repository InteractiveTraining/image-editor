import {Component, Element, Event, EventEmitter, h, Host, Listen, Prop, State} from '@stencil/core';
import Jimp from 'jimp';

@Component({
  tag: 'it-image-editor',
  styleUrl: 'image-editor.scss',
  shadow: true
})
export class ImageEditor {
  private imageEl: HTMLImageElement;
  private resizeEl: HTMLDivElement;
  private fileInput: HTMLIonInputElement;
  
  @Element() el: HTMLElement;
  @Prop({mutable: true}) src: string;
  
  @State() startX: number = 0;
  @State() startY: number = 0;
  
  @State() posX: number = 0;
  @State() posY: number = 0;
  
  @State() isMoving: boolean;
  @State() isCropping: boolean;
  
  @State() scale: number = 100;
  @State() scaleWidth: number;
  @State() originalWidth: number;
  
  @State() previewWidth: number;
  @State() previewHeight: number;
  
  @State() rotateStep: number = 1;
  @State() flipHorizontal: boolean = false;
  @State() flipVertical: boolean = false;
  
  @State() blurValue: number = 0;
  @State() fileName: string;
  
  @State() srcHistory: string[] = [];
  
  /**
   * Emitted when the save button is clicked.
   */
  @Event() save: EventEmitter<{ base64: string }>;
  
  componentDidLoad() {
    this.setImageSrc(this.src);
  }
  
  private async setImageSrc(src: string, saveToHistroy: boolean = true) {
    if (!src) return;
    
    this.src = src;
    this.imageEl.src = src;
    
    if (saveToHistroy) {
      this.srcHistory = [...this.srcHistory, src];
    }
    
    this.isCropping = false;
    this.imageEl.style.maxWidth = 'unset';
    this.scale = 100;
    this.blurValue = 0;
    setTimeout(() => {
      this.originalWidth = this.imageEl.width;
      this.scaleWidth = this.originalWidth;
    }, 300);
  }
  
  private selectImage() {
    const inputEl: HTMLInputElement = this.fileInput.querySelector('input');
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      this.fileName = inputEl.files[0].name;
      this.srcHistory = [];
      this.setImageSrc(reader.result.toString());
    }, false);
    reader.readAsDataURL(inputEl.files[0]);
  }
  
  async download() {
    // const image = new Image();
    // image.src = await this.buildImage();
    // window.open("", '_blank').document.write(image.outerHTML);
    this.save.emit({base64: await this.buildImage()});
  }
  
  private async buildImage(rotate: boolean = false) {
    const dimensions = (this.isCropping) ? this.resizeEl.getBoundingClientRect() : {
      width: this.imageEl.clientWidth,
      height: this.imageEl.clientHeight
    };
    this.previewWidth = dimensions.width;
    this.previewHeight = dimensions.height;
    
    const jimp = await Jimp.read(this.imageEl.src);
    jimp.resize(this.scaleWidth, Jimp.AUTO);
    if (this.isCropping) jimp.crop(this.posX, this.posY, this.previewWidth, this.previewHeight);
    if (this.blurValue > 0) jimp.blur(this.blurValue);
    jimp.flip(this.flipHorizontal, this.flipVertical);
    if (rotate) jimp.rotate(270 * this.rotateStep);
    return jimp.getBase64Async(Jimp.AUTO as any);
  }
  
  private async saveCrop() {
    await this.setImageSrc(await this.buildImage());
  }
  
  private async rotate() {
    await this.setImageSrc(await this.buildImage(true));
    this.rotateStep++;
  }
  
  private async flip(type: 'vertical' | 'horizontal') {
    if (type === 'horizontal') this.flipHorizontal = !this.flipHorizontal; else this.flipVertical = !this.flipVertical;
    await this.setImageSrc(await this.buildImage());
  }
  
  private onScale(e) {
    if (this.isCropping) this.isCropping = false;
    this.scale = e.detail.value;
    this.scaleWidth = (this.originalWidth * (this.scale / 100));
    this.imageEl.style.maxWidth = this.scaleWidth + 'px';
  }
  
  private enableCrop() {
    this.isCropping = !this.isCropping;
    setTimeout(() => (this.isCropping) ? this.resizeEl.style.left = (Math.abs(this.imageEl.getBoundingClientRect().left) + 10) + 'px' : null, 300);
  }
  
  private startCropElementDrag(e) {
    const bounds = this.resizeEl.getBoundingClientRect();
    this.startX = e.clientX;
    this.startY = e.clientY;
    
    if (!((this.startY > (bounds.bottom - 20) && this.startY < (bounds.bottom + 20)) && (this.startX > (bounds.right - 20) && this.startX < (bounds.right + 20)))) {
      this.isMoving = true;
    }
  }
  
  @Listen('mouseup', {target: 'window'})
  endCropElementDrag() {
    if (!this.isMoving) return;
    
    this.isMoving = false;
  }
  
  @Listen('mousemove', {target: 'window'})
  onCropElementMove(e) {
    if (!this.isMoving) return;
    
    this.posY = (this.resizeEl.offsetTop - (this.startY - e.clientY));
    this.posX = (this.resizeEl.offsetLeft - (this.startX - e.clientX));
    this.startX = e.clientX;
    this.startY = e.clientY;
    
    this.resizeEl.style.top = this.posY + "px";
    this.resizeEl.style.left = this.posX + "px";
  }
  
  private async undo() {
    this.srcHistory = this.srcHistory.filter(el => el !== this.srcHistory[this.srcHistory.length - 1]);
    await this.setImageSrc(this.srcHistory[this.srcHistory.length - 1], false);
  }
  
  private async navigateHistory(img: string) {
    const index = this.srcHistory.findIndex(el => el === img);
    this.srcHistory = this.srcHistory.slice(0, (index + 1));
    await this.setImageSrc(this.srcHistory[this.srcHistory.length - 1], false);
  }
  
  render() {
    return <Host style={{
      '--img-blur': `${(this.blurValue / 1.5)}px`,
      '--crop-focus': (this.isCropping) ? '65%' : '1'
    }}>
      <div class={'image-editor-container'}>
        <div class={'original-image-container'}>
          <div>
            <img ref={el => this.imageEl = el as HTMLImageElement}/>
            {(this.isCropping) &&
            <div class={'resize-canvas'} onMouseDown={(e) => this.startCropElementDrag(e)}
                 ref={el => this.resizeEl = el as HTMLDivElement}/>}
          </div>
        </div>
        <div>
          <ion-header>
            <ion-toolbar color={'dark'}>
              {(this.srcHistory.length > 1) && <ion-buttons slot="start" title={'Undo'} onClick={() => this.undo()}>
                <ion-button icon-only>
                  <ion-icon name="arrow-back" size="large"/>
                </ion-button>
              </ion-buttons>}
              <ion-title>{this.fileName}</ion-title>
              <ion-buttons slot="end">
                {(!this.isCropping && this.scale === 100 && this.blurValue === 0)
                  ? <ion-button icon-only color="light" title={'Save as'} onClick={() => this.download()}
                                disabled={!this.src}>
                    <ion-icon name="cloud-download" size="large"/>
                  </ion-button>
                  : <ion-button icon-only color="secondary" title={'Save'} onClick={() => this.saveCrop()}
                                disabled={!this.src}>
                    <ion-icon name="checkmark" size="large"/>
                  </ion-button>}
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content>
            <ion-tabs>
              <ion-tab tab={'default'}>
                <ion-list lines={'full'}>
                  <ion-item class={'settings-nav'}>
                    <ion-label>
                      <ion-tab-bar color={'dark'}>
                        <ion-tab-button title={'Crop'} onClick={() => this.enableCrop()} disabled={!this.src}>
                          <ion-icon name="crop"/>
                        </ion-tab-button>
                        <ion-tab-button title={'Rotate'} onClick={() => this.rotate()} disabled={!this.src}>
                          <ion-icon name="repeat"/>
                        </ion-tab-button>
                        <ion-tab-button title={'Flip horizontally'} onClick={() => this.flip('horizontal')}
                                        disabled={!this.src}>
                          <ion-icon name="arrow-dropleft"/>
                        </ion-tab-button>
                        <ion-tab-button title={'Flip vertically'} onClick={() => this.flip('vertical')}
                                        disabled={!this.src}>
                          <ion-icon name="arrow-dropup"/>
                        </ion-tab-button>
                      </ion-tab-bar>
                    </ion-label>
                  </ion-item>
                  <ion-item color={'dark'}>
                    <ion-label position={'fixed'}>Image</ion-label>
                    <ion-input name="file"
                               ref={el => this.fileInput = el as HTMLIonInputElement}
                               type={'file' as any}
                               inputmode={'file'}
                               onChange={() => this.selectImage()}
                               spellcheck={false}
                               autocapitalize={'none'}
                               autocomplete={'off'}
                               autocorrect={'off'}
                               required/>
                  </ion-item>
                  <ion-item color={'dark'}>
                    <ion-label position={'fixed'}>
                      <ion-icon name="resize"/>
                      Scale
                    </ion-label>
                    <ion-range min={0} max={100} step={1} snaps={true} value={this.scale} pin={true} color="light"
                               onIonChange={(e) => this.onScale(e)} disabled={!this.src}/>
                  </ion-item>
                  <ion-item color={'dark'}>
                    <ion-label position={'fixed'}>
                      <ion-icon name="snow"/>
                      Blur
                    </ion-label>
                    <ion-range min={0} max={50} step={1} snaps={true} value={this.blurValue} pin={true} color="light"
                               onIonChange={(e) => this.blurValue = e.detail.value as number} disabled={!this.src}/>
                  </ion-item>
                </ion-list>
              </ion-tab>
              <ion-tab tab={'history'}>
                <div class={'history-container'}>
                  {this.srcHistory.slice(0, this.srcHistory.length - 1).map((img) => {
                    return <div class={'history-image'} title={'Undo'} style={{
                      'background': `url(${img})`,
                      'background-size': 'cover',
                      'background-repeat': 'no-repeat'
                    }} onClick={() => this.navigateHistory(img)}>
                    </div>
                  })}
                </div>
              </ion-tab>
              <ion-tab-bar slot="bottom" color={'dark'} class={'tab-navigation'}>
                <ion-tab-button tab={'default'} disabled={!this.src}>
                  <ion-icon name="settings"/>
                  <ion-label>Settings</ion-label>
                </ion-tab-button>
                <ion-tab-button tab={'history'} disabled={!this.src}>
                  <ion-icon name="git-branch"/>
                  <ion-label>History</ion-label>
                  <ion-badge>{this.srcHistory.slice(0, this.srcHistory.length - 1).length}</ion-badge>
                </ion-tab-button>
              </ion-tab-bar>
            </ion-tabs>
          </ion-content>
        </div>
      </div>
    </Host>;
  }
}
