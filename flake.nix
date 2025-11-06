{
  description = "Feather-ink Typst IDE development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in {
        devShell = pkgs.mkShell {
          buildInputs = [
            pkgs.nodejs
            pkgs.rustc
            pkgs.cargo
            pkgs.pkg-config
            pkgs.glib
            pkgs.gtk3
            pkgs.libsoup_2_4
            pkgs.webkitgtk
            pkgs.typst
          ];
          shellHook = ''
            echo "Welcome to the Feather-ink development shell!"
            echo "All dependencies are available. Use 'npm install' and 'npm run tauri:dev'."
          '';
        };
      });
}