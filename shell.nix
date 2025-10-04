{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.rustc
    pkgs.cargo
    pkgs.pkg-config
    pkgs.glib
    pkgs.gtk3
    pkgs.libsoup_2_4
    pkgs.webkitgtk
    pkgs.typst
  ];
}