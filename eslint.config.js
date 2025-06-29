import js from "@eslint/js";
import globals from "globals";
import pluginVue from "eslint-plugin-vue";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";
import vueEslintParser from "vue-eslint-parser";
import babelEslintParser from "@babel/eslint-parser";

export default defineConfig([
  // 忽略特定文件
  {
    ignores: [
      "src/assets/scripts/anime.min.js",
      "src/assets/scripts/fireworks.js"
    ]
  },

  // JS 配置
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"] },
  { files: ["**/*.{js,mjs,cjs}"], languageOptions: { globals: globals.browser } },

  // Vue 推荐规则（必须单独作为一个对象）
  ...pluginVue.configs["flat/recommended"],

  // Vue 文件的 parser 配置，并关闭风格类规则
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueEslintParser,
      parserOptions: {
        parser: babelEslintParser,
        ecmaVersion: 2022,
        sourceType: "module",
        requireConfigFile: false
      }
    },
    plugins: { vue: pluginVue },
    rules: {
      // 关闭所有风格类规则
      "vue/html-indent": "off",
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/multiline-html-element-content-newline": "off",
      "vue/html-closing-bracket-newline": "off",
      "vue/html-closing-bracket-spacing": "off",
      "vue/first-attribute-linebreak": "off",
      "vue/attribute-hyphenation": "off",
      "vue/html-self-closing": "off",
      "vue/prop-name-casing": "off",
      "vue/attributes-order": "off",
      "vue/order-in-components": "off",
      "vue/this-in-template": "off"
    }
  },

  // CSS 配置
  { files: ["**/*.css"], plugins: { css }, language: "css/css", extends: ["css/recommended"] },
]);
