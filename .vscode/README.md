# Borealis Theme

This directory contains the Borealis color palette configuration for Visual Studio Code.

## Overview

The Borealis theme is a dark color scheme designed to provide a comfortable coding experience with carefully selected colors for syntax highlighting and UI elements.

## Files

- **borealis-theme.json**: Complete theme definition in VS Code theme format
- **settings.json**: Workspace settings that apply the Borealis color palette to this project

## Color Palette

The Borealis theme features:

- **Background colors**: Deep blue-grays (#232530, #2C2E3B, #272935)
- **Foreground**: Soft white (#D5D7E5)
- **Accent**: Teal/cyan (#5cb3c1)
- **Cursor**: Orange (#ff9933)
- **Syntax colors**:
  - Comments: Muted gray-blue (#4c5372) with italic style
  - Strings: Soft green (#8bd49d)
  - Numbers/Constants: Peach (#e9b093)
  - Keywords: Purple (#b68acb)
  - Functions: Teal (#5cb3c1)
  - Variables: Light gray (#D5D7E5)
  - Tags: Pink (#e96590)

## Usage

### Automatic Application

When you open this workspace in VS Code, the Borealis theme colors will be automatically applied through the `settings.json` file.

### Manual Installation

If you want to use this theme in other projects:

1. Copy the `borealis-theme.json` file to your `.vscode` directory
2. Add the color customizations from `settings.json` to your workspace settings

### As a VS Code Extension

To use this as a full theme extension:

1. Create a VS Code extension structure
2. Add the `borealis-theme.json` content to a `themes` directory
3. Create a `package.json` with theme contribution point
4. Install the extension in VS Code

## Theme Type

- **Type**: Dark theme
- **Best for**: Extended coding sessions, low-light environments
- **Optimized for**: HTML, CSS, JavaScript, JSON, and general web development

## Customization

You can customize any color in the `settings.json` file to match your preferences. Refer to the [VS Code Theme Color Reference](https://code.visualstudio.com/api/references/theme-color) for available color keys.
