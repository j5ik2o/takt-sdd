## [0.10.0](https://github.com/j5ik2o/takt-sdd/compare/v0.9.0...v0.10.0) (2026-02-23)


### Features

* **ci:** BugBot PRコメントをGitHub Issueに自動起票するワークフローを追加 ([baaa5f8](https://github.com/j5ik2o/takt-sdd/commit/baaa5f854daa2ba70cc7636f716f9c69c5d12cbb))
* **takt-piece/facet/optimize:** add validate-takt-files.sh ([57f0169](https://github.com/j5ik2o/takt-sdd/commit/57f016958ce56c65e25de4e2e6a4778399aaae97))
* **takt-task:** add order.md validation script ([d015d40](https://github.com/j5ik2o/takt-sdd/commit/d015d40290a6635df092cdab1c9022534caa1d27))


### Bug Fixes

* **ci:** BugBot→Issue ワークフローのセキュリティ・誤発火バグを修正 ([7c77055](https://github.com/j5ik2o/takt-sdd/commit/7c770555404fe6ef2aa0206372f6452183965d27))
* **takt-task:** correct path to `validate-order-md.sh` in SKILL.md and directory structure ([0fb1524](https://github.com/j5ik2o/takt-sdd/commit/0fb152498d7dce969a71baa892b5fa4d444300cc))
* **takt-task:** correct script path and improve validation output ([376fd2d](https://github.com/j5ik2o/takt-sdd/commit/376fd2da10f7c8f6be2ecb139a29d1a86da17794))
* **takt-task:** improve validation for section headers and field extraction ([93ce082](https://github.com/j5ik2o/takt-sdd/commit/93ce082db7cf103b4958362499e6070b0de84d52))
* **validate:** BSD/macOS互換性とPOSIX ERE準拠の修正 ([3259327](https://github.com/j5ik2o/takt-sdd/commit/325932758f33efb17ca98f7f00a28e33813df131))
* **validate:** コードインジェクション・regexインジェクション脆弱性を修正 ([e135383](https://github.com/j5ik2o/takt-sdd/commit/e135383edbcfad20ddf6450a37869e56804fb869))

## [0.9.0](https://github.com/j5ik2o/takt-sdd/compare/v0.8.0...v0.9.0) (2026-02-23)


### Features

* **installer:** add takt-task to TAKT_SKILLS list ([65c8f0e](https://github.com/j5ik2o/takt-sdd/commit/65c8f0e7ad62361d8869818be0997acaa4913770))
* **skills:** add TAKT Task Creator skill for task generation and metadata management ([95c9e3c](https://github.com/j5ik2o/takt-sdd/commit/95c9e3c134928be3a3793fd4f1afddbdda7b11c0))

## [0.8.0](https://github.com/j5ik2o/takt-sdd/compare/v0.7.0...v0.8.0) (2026-02-22)


### Features

* **installer:** recalculate file hashes for legacy layout and update manifest ([d60717b](https://github.com/j5ik2o/takt-sdd/commit/d60717b0e848018fbca2a1a51325b10dd9bcdbb3))
* **installer:** rewrite piece paths for legacy layout before sync ([66ada40](https://github.com/j5ik2o/takt-sdd/commit/66ada405cbd62befe2233a37b0614b0be5b02fb8))
* update facets layout and version to 0.7.0, add new documentation files ([63eb64d](https://github.com/j5ik2o/takt-sdd/commit/63eb64d90f07bdb6187aaa002cc0c02611316f6e))

## [0.7.0](https://github.com/j5ik2o/takt-sdd/compare/v0.6.0...v0.7.0) (2026-02-21)


### Features

* **sdd:** remove parallel batch processing instructions and YAML configuration ([538dbf8](https://github.com/j5ik2o/takt-sdd/commit/538dbf8e4998e48cf810fd78f6f6421c33d35c11))

## [0.6.0](https://github.com/j5ik2o/takt-sdd/compare/v0.5.0...v0.6.0) (2026-02-20)


### Features

* **installer:** add manifest-based smart update for safe reinstallation ([93ad569](https://github.com/j5ik2o/takt-sdd/commit/93ad5694002022ee62ab4cfcfb1d348cbb8a4cd6))
* **qgrep:** add initial implementation for CLI tool with regex-based file search ([0cae3ce](https://github.com/j5ik2o/takt-sdd/commit/0cae3ce62e5f80f5c57f316792c168d6c133ca48))

## [0.5.0](https://github.com/j5ik2o/takt-sdd/compare/v0.4.0...v0.5.0) (2026-02-20)


### Features

* **scripts:** prefer local node_modules takt over global ([25c29c0](https://github.com/j5ik2o/takt-sdd/commit/25c29c021af8a3afd37baf18661b420650c0c2b2))

## [0.4.0](https://github.com/j5ik2o/takt-sdd/compare/v0.3.1...v0.4.0) (2026-02-20)


### Features

* **ci:** replace manual commit analysis with conventional-changelog-action ([6f8457f](https://github.com/j5ik2o/takt-sdd/commit/6f8457f55dd4e465c8b1448f4d0d8abff4272281))

## [0.3.1](https://github.com/j5ik2o/takt-sdd/compare/v0.3.0...v0.3.1) (2026-02-20)


### Features

* **installer:** read takt version from root package.json instead of hardcoding ([507becd](https://github.com/j5ik2o/takt-sdd/commit/507becdac4ce5d7725cc2783dd4af74ede5cedf2))

## [0.3.0](https://github.com/j5ik2o/takt-sdd/compare/v0.2.1...v0.3.0) (2026-02-20)


### Features

* **sdd:** add existing implementation context to requirements process ([a09f007](https://github.com/j5ik2o/takt-sdd/commit/a09f0071a732ccdec9efaabd567d2ee7493ed70d))
* update takt reference file ([a3e4c1a](https://github.com/j5ik2o/takt-sdd/commit/a3e4c1a1dd9b9951e1fe110bd6ba2ff108e2feb1))

## [0.2.1](https://github.com/j5ik2o/takt-sdd/compare/v0.2.0...v0.2.1) (2026-02-20)


### Features

* **skills:** add multi-language support for TAKT skill files ([85dadc6](https://github.com/j5ik2o/takt-sdd/commit/85dadc630add533f73f03c7d9b3539b888d7f3f4))

## [0.2.0](https://github.com/j5ik2o/takt-sdd/compare/v0.1.3...v0.2.0) (2026-02-20)


### Features

* **i18n:** separate .takt/ facets by language and add English translations ([af3fe31](https://github.com/j5ik2o/takt-sdd/commit/af3fe31c8bc69cd75dccc14d250a3d6b9c1b30ee))
* **installer:** add --refs-path option for configurable takt references path ([2474fa2](https://github.com/j5ik2o/takt-sdd/commit/2474fa2889074e19a4b7532b8491e26b47a3078f))
* **installer:** add skill installation and symlink support ([c3fdfcb](https://github.com/j5ik2o/takt-sdd/commit/c3fdfcbf8ea7c32fc687fde259974f97b9c5b7ac))
* **installer:** add TAKT references download and install ([f68518c](https://github.com/j5ik2o/takt-sdd/commit/f68518ca803a6b8d8c1fbb45371f25da379c5863))
* **installer:** add takt to devDependencies automatically ([6409413](https://github.com/j5ik2o/takt-sdd/commit/6409413451f3be2c40dca037925ea4336eed7dd5))
* **installer:** pin takt references to submodule commit hash ([c53aa35](https://github.com/j5ik2o/takt-sdd/commit/c53aa358a906e7a3b7971d1e642ed080cb0c701e))
* **skills:** add documentation for new TAKT skills ([52abf9a](https://github.com/j5ik2o/takt-sdd/commit/52abf9a5ffa063f44213d5b872456d816a081d53))
* **steering:** add greenfield support for bootstrap mode ([30b946b](https://github.com/j5ik2o/takt-sdd/commit/30b946b67b3505a7962ecd0816b2c7eef3f759ff))


### Bug Fixes

* **ci:** tolerate takt prompt Phase 2/3 reportContent preview error ([0ce71d7](https://github.com/j5ik2o/takt-sdd/commit/0ce71d747cdb354c8ee9e25d9b7e49b1f58643eb))
* **ci:** use PAT in release workflow to trigger downstream workflows ([8a77878](https://github.com/j5ik2o/takt-sdd/commit/8a7787894d159396a0744566d3c49bb892ffcd3f))

## [0.1.3](https://github.com/j5ik2o/takt-sdd/compare/v0.1.2...v0.1.3) (2026-02-20)


### Bug Fixes

* **references:** update `okite-ai` file content ([76184f4](https://github.com/j5ik2o/takt-sdd/commit/76184f4ed758b96bfeff0bff1585a95114b9e722))

## [0.1.2](https://github.com/j5ik2o/takt-sdd/compare/7de6a7742c2eb63ad8f96d3c9c74933202921995...v0.1.2) (2026-02-20)


### Features

* **installer:** add --tag option and download from release tags ([7de6a77](https://github.com/j5ik2o/takt-sdd/commit/7de6a7742c2eb63ad8f96d3c9c74933202921995))

