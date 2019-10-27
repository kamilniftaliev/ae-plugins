do shell script "cp -rf dist/ '/Volumes/Mojave/Applications/Adobe After Effects CC 2019/Scripts/ScriptUI Panels'" user name "Kamil" password "kkkk" with administrator privileges

tell application "Adobe After Effects CC 2019"
   DoScriptFile (POSIX path of ((path to me as text) & "::") & "dist/PluginsRunner.jsx" as POSIX file)
   activate
end tell