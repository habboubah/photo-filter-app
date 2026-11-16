# Adds the home-screen widget (ios/App/BildklarWidget) to App.xcodeproj as an
# app extension target, embedded in the app, and gives both targets the App
# Group they share. Safe to run again: it does nothing when the target exists.
#   gem install xcodeproj; ruby ios/scripts/add-widget.rb
require 'xcodeproj'

root = File.expand_path('../App', __dir__)
project = Xcodeproj::Project.open(File.join(root, 'App.xcodeproj'))
app = project.targets.find { |t| t.name == 'App' } or abort 'No App target'
if project.targets.any? { |t| t.name == 'BildklarWidget' }
  puts 'BildklarWidget is already in the project.'
  exit 0
end

group = project.main_group.find_subpath('BildklarWidget', true)
group.set_source_tree('<group>')
group.set_path('BildklarWidget')

widget = project.new_target(:app_extension, 'BildklarWidget', :ios, '16.0', nil, :swift)
# new_target links Foundation by a path into one SDK version; Swift links it by itself.
widget.frameworks_build_phase.files.to_a.each do |file|
  ref = file.file_ref
  next unless ref && ref.path.to_s.end_with?('Foundation.framework')
  widget.frameworks_build_phase.remove_build_file(file)
  ref.remove_from_project
end
ios_group = project.frameworks_group['iOS']
ios_group.remove_from_project if ios_group && ios_group.children.empty?
widget.add_file_references([group.new_reference('BildklarWidget.swift')])
group.new_reference('Info.plist')
group.new_reference('BildklarWidget.entitlements')

# The texts of the widget gallery, in German and English.
strings = group.new_variant_group('Localizable.strings')
%w[de en].each { |lang| strings.new_reference("#{lang}.lproj/Localizable.strings").tap { |r| r.name = lang } }
widget.add_resources([strings])

%w[WidgetKit SwiftUI].each do |name|
  ref = project.frameworks_group.new_file("System/Library/Frameworks/#{name}.framework", :sdk_root)
  widget.frameworks_build_phase.add_file_reference(ref, true)
end

app_settings = app.build_configurations.first.build_settings
widget.build_configurations.each do |config|
  s = config.build_settings
  s['PRODUCT_NAME'] = '$(TARGET_NAME)'
  s['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.habboubah.bildklar.widget'
  s['INFOPLIST_FILE'] = 'BildklarWidget/Info.plist'
  s['CODE_SIGN_ENTITLEMENTS'] = 'BildklarWidget/BildklarWidget.entitlements'
  s['CODE_SIGN_STYLE'] = 'Automatic'
  s['IPHONEOS_DEPLOYMENT_TARGET'] = '16.0'
  s['TARGETED_DEVICE_FAMILY'] = '1'
  s['SWIFT_VERSION'] = '5.0'
  s['MARKETING_VERSION'] = app_settings['MARKETING_VERSION']
  s['CURRENT_PROJECT_VERSION'] = app_settings['CURRENT_PROJECT_VERSION']
  s['SKIP_INSTALL'] = 'YES'
  s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
  s['ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME'] = ''
end
app.build_configurations.each { |config| config.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/App.entitlements' }
app_group = project.main_group.children.find { |g| g.display_name == 'App' && g.is_a?(Xcodeproj::Project::Object::PBXGroup) }
app_group.new_reference('App.entitlements') if app_group && app_group.files.none? { |f| f.path == 'App.entitlements' }

# Built before the app and copied into its PlugIns folder.
app.add_dependency(widget)
embed = app.new_copy_files_build_phase('Embed Foundation Extensions')
embed.symbol_dst_subfolder_spec = :plug_ins
embed.add_file_reference(widget.product_reference, true).settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }

project.save
puts 'Added BildklarWidget.'
