# Licences of the on-device AI

Bildklar's AI runs only on the phone. These are the parts it ships.

## SigLIP 2 (image encoder, and the label and search vectors made with its text encoder)

`google/siglip2-base-patch32-256` — Copyright 2025 Google LLC.
Licensed under the Apache License, Version 2.0.
https://huggingface.co/google/siglip2-base-patch32-256

`image.onnx` is the model's vision tower, exported to ONNX with its matrix
weights quantised to 4 bits; `compact.bin` is a projection of its embeddings
(computed from embeddings of Bildklar's own drawn test pictures and of photos
used only for that computation, none of which ship). The app's label and
search vectors (src/logic/aiLabels.json, src/search/words.json) are
embeddings of Bildklar's own prompts made with the model's text encoder. All
are derived from the original model.

## YuNet (Android's face detector)

`faces.onnx` is `face_detection_yunet_2023mar.onnx` from the OpenCV Zoo
(https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet),
unchanged. Copyright (c) 2020 Shiqi Yu. Licensed under the MIT License.

## ONNX Runtime

Copyright (c) Microsoft Corporation. Licensed under the MIT License.
https://github.com/microsoft/onnxruntime

## Apache License 2.0 (summary)

You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
