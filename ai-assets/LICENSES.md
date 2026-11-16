# Licences of the on-device AI

Bildklar's AI runs only on the phone. These are the parts it ships.

## SigLIP 2 (image encoder and the label vectors made with its text encoder)

`google/siglip2-base-patch32-256` — Copyright 2025 Google LLC.
Licensed under the Apache License, Version 2.0.
https://huggingface.co/google/siglip2-base-patch32-256

`image.onnx` is the model's vision tower, exported to ONNX and quantised to
8-bit weights; `vectors.bin` holds embeddings of Bildklar's own label prompts
made with the model's text encoder. Both are derived from the original model.

## ONNX Runtime

Copyright (c) Microsoft Corporation. Licensed under the MIT License.
https://github.com/microsoft/onnxruntime

## Apache License 2.0 (summary)

You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
