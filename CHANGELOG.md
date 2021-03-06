# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.2.0](https://github.com/kwangure/storables/compare/v0.2.0-rc.0...v0.2.0) (2021-12-09)


### ⚠ BREAKING CHANGES

* cleanup io `read` and `write` API
* rename persistable `update` to `start` for consistency

### Features

* cleanup io `read` and `write` API ([062c713](https://github.com/kwangure/storables/commit/062c713f2de4978ca695850083d6c1ab26124ab7))
* rename persistable `update` to `start` for consistency ([d0b0403](https://github.com/kwangure/storables/commit/d0b0403731468f3b7afe9bb6189a7baed7d4492d))

## [0.2.0-rc.0](https://github.com/kwangure/storables/compare/v0.1.1...v0.2.0-rc.0) (2021-08-28)


### ⚠ BREAKING CHANGES

* `write` value if `read` returns undefined

### Features

* `write` value if `read` returns undefined ([87f3c7d](https://github.com/kwangure/storables/commit/87f3c7d773a0fc49ae0439ab0fb635b614d47dac))

### [0.1.1](https://github.com/kwangure/storables/compare/v0.1.1-rc.1...v0.1.1) (2021-08-27)

### [0.1.1-rc.1](https://github.com/kwangure/storables/compare/v0.1.1-rc.0...v0.1.1-rc.1) (2021-08-27)


### Bug Fixes

* do clean build before release ([4dc3d41](https://github.com/kwangure/storables/commit/4dc3d411c2d6ee2ea4e431823a3f34c2e21f03c6))

### [0.1.1-rc.0](https://github.com/kwangure/storables/compare/v0.1.0...v0.1.1-rc.0) (2021-08-27)


### Bug Fixes

* call `start` for all transforms ([087c04c](https://github.com/kwangure/storables/commit/087c04c2d47a4d2a31c133bd66a67b021fabb1ff))

## [0.1.0](https://github.com/kwangure/storables/compare/v0.0.2-rc.1...v0.1.0) (2021-08-10)


### ⚠ BREAKING CHANGES

* use `check` and `assert` instead of `validate`
* use validationStatus pattern in `transformable`
* rename `Options` to `TransformableOptions`

### Features

* add reset helper to persistable ([3d505dd](https://github.com/kwangure/storables/commit/3d505dd125aeaf84ae06784d68c082e2bc447764))
* add validable ([466c415](https://github.com/kwangure/storables/commit/466c415d77f620327edaeed6b01f8fb677920e85))
* rename `Options` to `TransformableOptions` ([be3e617](https://github.com/kwangure/storables/commit/be3e617a9f129f576e0e8fb6be7f7c63bb513f8f))
* use `check` and `assert` instead of `validate` ([9f1f89b](https://github.com/kwangure/storables/commit/9f1f89bacfeadbff125ddbafdf78cc7b20e6f877))
* use dequal/lite to check for equality ([bf5a509](https://github.com/kwangure/storables/commit/bf5a5097654c2e3b50d97569f8f6eb65b6b19d99))
* use validationStatus pattern in `transformable` ([3312c79](https://github.com/kwangure/storables/commit/3312c79862284d78c18d462c4da61b539022ffeb))


### Bug Fixes

* check for falsy stores ([3c8ad40](https://github.com/kwangure/storables/commit/3c8ad405f69eac024e5162a1f87bbc67690184b5))
* oops. remove debug code ([6a3b746](https://github.com/kwangure/storables/commit/6a3b74621a24a01af87862474cc0d200d1ce8fc0))
* package validatables ([1a79ada](https://github.com/kwangure/storables/commit/1a79ada62ca113e1e6aff8433d6abad5f7e4842f))

### [0.0.2-rc.1](https://github.com/kwangure/storables/compare/v0.0.2-rc.0...v0.0.2-rc.1) (2021-08-06)

### [0.0.2-rc.0](https://github.com/kwangure/storables/compare/v0.0.1...v0.0.2-rc.0) (2021-08-06)


### Features

* add `equal` API to transformable ([4275b62](https://github.com/kwangure/storables/commit/4275b62e836e76e0edd869edb0f083e427685702))
* add persistable ([f12fc01](https://github.com/kwangure/storables/commit/f12fc015c0c4bef2b391bf1c68f86b5cdc524370))


### Bug Fixes

* pass invalidate subscribe ([23b6783](https://github.com/kwangure/storables/commit/23b6783e58d189ae3619563e81388a211deae693))

### 0.0.1 (2021-08-02)


### Features

* initial commit ([47fe614](https://github.com/kwangure/storables/commit/47fe61418559e75ed5f95eb628902626cd3d6ee3))
