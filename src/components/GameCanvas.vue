<!-- Back to Selection Button -->
<div v-if="!isLoading" class="back-button" @click="emit('game-end')" title="Return to main menu">
    <Settings class="h-6 w-6" />
  </div>

<RocketSelector v-if="!isLoading" title="Choose your rocket" />

<TextureSelector v-if="!isLoading" title="Select landing pad texture" />
<!-- Camera View Switch Button -->
<div
  v-if="!isLoading"
  class="camera-switch-button"
  @click="cycleCameraView"
  :title="'Switch camera view - Current: ' + hudStore.cameraView"
>
    <SwitchCamera />
  </div>
<!-- PIP View Toggle Button -->
<div
  v-if="!isLoading"
  :class="getPIPButtonClass()"
  @click="togglePIPView"
  title="Toggle picture-in-picture landing pad view"
>
    <Focus class="h-6 w-6" />
  </div>
