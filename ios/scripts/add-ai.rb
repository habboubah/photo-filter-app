# Adds the on-device AI (docs/AI.md) to App.xcodeproj: ImageEmbedder.swift
# in the App target's sources, the repository's ai-assets folder (the model
# and the label vectors) as a folder resource of the app bundle, and ONNX
# Runtime's Swift package (exact version below) linked into the App target.
# Safe to run again: it only adds what is missing.
#   gem install xcodeproj; ruby ios/scripts/add-ai.rb
require 'xcodeproj'

ORT_URL = 'https://github.com/microsoft/onnxruntime-swift-package-manager'
ORT_VERSION = '1.24.2'

root = File.expand_path('../App', __dir__)
project = Xcodeproj::Project.open(File.join(root, 'App.xcodeproj'))
app = project.targets.find { |t| t.name == 'App' } or abort 'No App target'
app_group = project.main_group.find_subpath('App', false) or abort 'No App group'

# ImageEmbedder.swift, next to the plugin's other Swift files.
unless app.source_build_phase.files_references.any? { |r| r.path == 'ImageEmbedder.swift' }
  ref = app_group.files.find { |f| f.path == 'ImageEmbedder.swift' } || app_group.new_reference('ImageEmbedder.swift')
  app.source_build_phase.add_file_reference(ref, true)
  puts 'Added ImageEmbedder.swift'
end

# ai-assets: a folder reference (copied as one folder, "ai-assets/…" in the bundle), from the repository root.
assets = app_group.children.find { |c| c.display_name == 'ai-assets' }
unless assets
  assets = app_group.new_reference('../../../ai-assets')
  assets.name = 'ai-assets'
  assets.last_known_file_type = 'folder'
  puts 'Added the ai-assets folder'
end
unless app.resources_build_phase.files_references.include?(assets)
  app.resources_build_phase.add_file_reference(assets, true)
end

# ONNX Runtime, the exact version, product "onnxruntime" (OnnxRuntimeBindings).
package = project.root_object.package_references.find { |p| p.respond_to?(:repositoryURL) && p.repositoryURL == ORT_URL }
unless package
  package = project.new(Xcodeproj::Project::Object::XCRemoteSwiftPackageReference)
  package.repositoryURL = ORT_URL
  project.root_object.package_references << package
  puts "Added the ONNX Runtime package #{ORT_VERSION}"
end
package.requirement = { 'kind' => 'exactVersion', 'version' => ORT_VERSION }
unless app.package_product_dependencies.any? { |d| d.product_name == 'onnxruntime' }
  dep = project.new(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
  dep.product_name = 'onnxruntime'
  dep.package = package
  app.package_product_dependencies << dep
  file = project.new(Xcodeproj::Project::Object::PBXBuildFile)
  file.product_ref = dep
  app.frameworks_build_phase.files << file
end

project.save
puts 'App.xcodeproj is up to date.'
