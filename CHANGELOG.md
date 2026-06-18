## [2.2.0](https://github.com/j5ik2o/takt-sdd/compare/v2.1.0...v2.2.0) (2026-06-18)


### Features

* **no-copy-bundled-assets-eject:** add read-only asset resolution ([1732477](https://github.com/j5ik2o/takt-sdd/commit/17324772c870c3a4a63231454ca0e690b0690dd2))
* **no-copy-bundled-assets-eject:** apply eject plans safely ([fba7ba8](https://github.com/j5ik2o/takt-sdd/commit/fba7ba8e06a3757b58b75d49997cbd6c2d5e3d42))
* **no-copy-bundled-assets-eject:** parse eject options ([edc9e2c](https://github.com/j5ik2o/takt-sdd/commit/edc9e2c0bc742dd630fc09ac03a4d37a39a79134))
* **no-copy-bundled-assets-eject:** plan eject asset copies ([8ab5d24](https://github.com/j5ik2o/takt-sdd/commit/8ab5d24ab5ba056ba42d4e64890845807d0873c1))
* **no-copy-bundled-assets-eject:** retire create cli ([f3428a5](https://github.com/j5ik2o/takt-sdd/commit/f3428a5fc6e270cb59ba41f65fa564ab9df75394))
* **no-copy-bundled-assets-eject:** retire init command ([e65d80f](https://github.com/j5ik2o/takt-sdd/commit/e65d80f6ab86c4a263ba4917e4f11c792dc5b3cd))
* **no-copy-bundled-assets-eject:** run bundled workflows without init ([58a1168](https://github.com/j5ik2o/takt-sdd/commit/58a116817c324884f1a75fca8023ca17dd62fabc))
* **no-copy-bundled-assets-eject:** update command help surface ([aa67fa7](https://github.com/j5ik2o/takt-sdd/commit/aa67fa75b11871940b18eca2ff43804315879174))
* **no-copy-bundled-assets-eject:** validate package migration guidance ([97d5375](https://github.com/j5ik2o/takt-sdd/commit/97d53751fe8b82af4d2dcc7f4d0227ad5d5978d7))
* **no-copy-bundled-assets-eject:** wire eject into cli dispatch ([4505dad](https://github.com/j5ik2o/takt-sdd/commit/4505dad5c37bad5b3787dbc1e2a0a4fe64f3e805))


### Bug Fixes

* **init:** honor force for bundled asset updates ([8fa9dc1](https://github.com/j5ik2o/takt-sdd/commit/8fa9dc1cc054dfe926c7d5fdedd4026f2439e770))
* **kiro:** align task requirement annotations ([60838ae](https://github.com/j5ik2o/takt-sdd/commit/60838aedc32f2ee679dfd6688af51ecd55e2c06a))
* **no-copy-bundled-assets-eject:** harden eject review findings ([662dc29](https://github.com/j5ik2o/takt-sdd/commit/662dc291a5080e4e20a78b3a24f0cfe5d09d071d))

## [2.1.0](https://github.com/j5ik2o/takt-sdd/compare/v2.0.1...v2.1.0) (2026-06-17)


### Features

* **kiro:** support parallel task waves ([361632b](https://github.com/j5ik2o/takt-sdd/commit/361632b08a5eab5254f669a9e7098e564bfbf3c8))

## [2.0.1](https://github.com/j5ik2o/takt-sdd/compare/v2.0.0...v2.0.1) (2026-06-15)


### Bug Fixes

* **deps:** update dependency takt to v0.45.0 ([7c8450d](https://github.com/j5ik2o/takt-sdd/commit/7c8450dc7c1f486f1f45e32f728a37c0b2d2ff1a))
* **release:** keep the core takt-sdd release marked as Latest ([3ede9f3](https://github.com/j5ik2o/takt-sdd/commit/3ede9f3130ca6705dcf470470cd91b9fe5d8a094))

## [2.0.0](https://github.com/j5ik2o/takt-sdd/compare/v1.1.0...v2.0.0) (2026-06-11)


### ⚠ BREAKING CHANGES

* The cc-sdd-* (10) and opsx-* (5) workflows, their
retired-exclusive facets, the cc-sdd:* / opsx:* npm scripts, and the
OpenSpec / cc-sdd init integrations are retired. takt-sdd init no
longer initializes OpenSpec or cc-sdd and propagates only the takt
dependency with kiro:* scripts. Updating a v1.x project removes
unmodified retired assets and drops them from the install manifest
(customized files are kept with a warning). opsx-* (OpenSpec)
workflows will be re-provided in a future release.
* **retire-legacy-workflow-surface:** retire cc-sdd-* and opsx-* workflows from the public surface (task 2)

### Features

* **claude:** add settings.json with environment configurations and language presets ([487977c](https://github.com/j5ik2o/takt-sdd/commit/487977cffcb424995b4de50c7390131490d9ab12))
* **cli:** introduce `takt-sdd` global CLI with init and workflow commands ([50209fa](https://github.com/j5ik2o/takt-sdd/commit/50209fab537e6719429a749299a8f72aab010a7a))
* **installer:** run pinned cc-sdd during setup ([13591bd](https://github.com/j5ik2o/takt-sdd/commit/13591bd828b9e70241c2327ea5acf70b0c9bdb4b))
* **kiro-ai-quality-gate-workflow-coverage:** add coverage validator ([e0daf15](https://github.com/j5ik2o/takt-sdd/commit/e0daf15cdfb700b1c7fb7afe38a2e6e57ab4af15))
* **kiro-ai-quality-gate-workflow-coverage:** add spec gate fix contract ([c4137ea](https://github.com/j5ik2o/takt-sdd/commit/c4137ea21d5629e1c10d5ad2392a680b2fbd88a8))
* **kiro-ai-quality-gate-workflow-coverage:** add spec quality gate ([11817d8](https://github.com/j5ik2o/takt-sdd/commit/11817d896823cb26bdd7ca71c0075c98228ba30b))
* **kiro-ai-quality-gate-workflow-coverage:** consume spec gate evidence ([2bb42f1](https://github.com/j5ik2o/takt-sdd/commit/2bb42f152d606d884afaa0f40abea9f862426d98))
* **kiro-ai-quality-gate-workflow-coverage:** define coverage inventory ([1cdbf8e](https://github.com/j5ik2o/takt-sdd/commit/1cdbf8e4ada41bbc3a43d84da2b929de8ce0bc66))
* **kiro-ai-quality-gate-workflow-coverage:** gate quick spec workflow ([615b508](https://github.com/j5ik2o/takt-sdd/commit/615b50839e06869bb2f9daee8fa6458b3b3f570e))
* **kiro-ai-quality-gate-workflow-coverage:** gate standalone spec workflows ([a588353](https://github.com/j5ik2o/takt-sdd/commit/a5883534bbde1018f6fb5130c353eb13e4eec7ca))
* **kiro-ai-quality-gate-workflow-coverage:** guard excluded kiro workflows ([ec77341](https://github.com/j5ik2o/takt-sdd/commit/ec77341faf149a098af992daccd8a5422fdb96b5))
* **kiro-ai-quality-gate-workflow-coverage:** share gate call contracts ([c53f66d](https://github.com/j5ik2o/takt-sdd/commit/c53f66d271c5d84290f7e140393284189dc07bec))
* **kiro-discovery-batch-workflows:** add batch summary contract ([53fb25b](https://github.com/j5ik2o/takt-sdd/commit/53fb25bca016b35c0b728e941c2ce892d7085ac0))
* **kiro-discovery-batch-workflows:** add batch workflow dispatcher ([146f17f](https://github.com/j5ik2o/takt-sdd/commit/146f17f1d713565593a663c914b4ab6dc3ab9349))
* **kiro-discovery-batch-workflows:** add cross-spec review contract ([e4dc524](https://github.com/j5ik2o/takt-sdd/commit/e4dc52497d02624cfa5388b5545da2df4d079199))
* **kiro-discovery-batch-workflows:** add discovery workflow ([b18a885](https://github.com/j5ik2o/takt-sdd/commit/b18a88524495a5df4d74b652a2737e95ff36f115))
* **kiro-discovery-batch-workflows:** add validation harness ([c8ec988](https://github.com/j5ik2o/takt-sdd/commit/c8ec988f05b6138b62aa2fed66f5a6c570e8dcc2))
* **kiro-discovery-batch-workflows:** complete roadmap parser task ([390c6a4](https://github.com/j5ik2o/takt-sdd/commit/390c6a470a1b17f904b6931ca5f89c6390d53422))
* **kiro-discovery-batch-workflows:** define brief artifact contract ([af7f0eb](https://github.com/j5ik2o/takt-sdd/commit/af7f0eb0fe57402e7f5e39a6570e014a4b441cfa))
* **kiro-discovery-batch-workflows:** define discovery routing contract ([e6e5db2](https://github.com/j5ik2o/takt-sdd/commit/e6e5db2eeacc495c8a557a703d7d509e37cd08c7))
* **kiro-discovery-batch-workflows:** define roadmap wave policy ([245ae6b](https://github.com/j5ik2o/takt-sdd/commit/245ae6b20f415215b8d235be224ee323e8c6f6c5))
* **kiro-discovery-batch-workflows:** reject unconnected facets ([06f061d](https://github.com/j5ik2o/takt-sdd/commit/06f061d3320efdb7792f695451df42f7b1093119))
* **kiro-discovery-batch-workflows:** validate batch wave prerequisites ([64ca6d1](https://github.com/j5ik2o/takt-sdd/commit/64ca6d1b0e8a471f3dd20d0f30aeeef6f777dabe))
* **kiro-discovery-batch-workflows:** validate facet inheritance ([5f66cd0](https://github.com/j5ik2o/takt-sdd/commit/5f66cd0406f14d8b34ff2556be7ca60c74ea06e0))
* **kiro-discovery-batch-workflows:** validate language parity ([11dfdae](https://github.com/j5ik2o/takt-sdd/commit/11dfdaed08e57ee6cbef71b15fe78a784b10d103))
* **kiro-discovery-batch-workflows:** validate remediation loop limits ([79babcf](https://github.com/j5ik2o/takt-sdd/commit/79babcfac9936dd5e00820f11af5da326e6fc083))
* **kiro-discovery-batch-workflows:** validate skill adapters ([f50cf2d](https://github.com/j5ik2o/takt-sdd/commit/f50cf2d80df9fef6e5798de0e77c9de5150de7aa))
* **kiro-discovery-batch-workflows:** wire validation commands ([60ca804](https://github.com/j5ik2o/takt-sdd/commit/60ca804d23a257d8419d9c54f9cdfede4b40c465))
* **kiro:** add AI quality gate to implementation workflow ([334a59a](https://github.com/j5ik2o/takt-sdd/commit/334a59a4aa9463eb46a65fb24b599b6458f14423))
* **kiro:** add discovery AI quality gate ([f0ec869](https://github.com/j5ik2o/takt-sdd/commit/f0ec869ddf58695b4f0ae4cbee72bf0b4612cf19))
* **kiro:** add parallel implementation reviewers ([e518598](https://github.com/j5ik2o/takt-sdd/commit/e518598b049ed40f2ca424f59c5e5dcd85ead308))
* retire cc-sdd-* and opsx-* workflows; v2.0.0 ships a kiro-only surface ([8c919f2](https://github.com/j5ik2o/takt-sdd/commit/8c919f2148d60c62e48908e23311e73978077cee))
* **retire-legacy-workflow-surface:** generalize retired-asset cleanup on update via RETIRED_MANIFEST_KEY_PATTERNS (task 5) ([3292136](https://github.com/j5ik2o/takt-sdd/commit/32921367421ef5ff95962f1da85fc47956f4a88b))
* **retire-legacy-workflow-surface:** invert validators to absence enforcement with retired cross-check (task 7) ([b3a3e0a](https://github.com/j5ik2o/takt-sdd/commit/b3a3e0a7b224dcc3d1802676350e9da143733485))
* **retire-legacy-workflow-surface:** remove legacy existence enforcement from surface validator (task 1.2) ([251e828](https://github.com/j5ik2o/takt-sdd/commit/251e828bbde6b0d127bfab6ab4ad0c46bddbf1c3))
* **retire-legacy-workflow-surface:** retire cc-sdd-* and opsx-* workflows from the public surface (task 2) ([55abeea](https://github.com/j5ik2o/takt-sdd/commit/55abeea72715bf22d685da55362fcd0241075190))
* **retire-legacy-workflow-surface:** retire cc-sdd/opsx npm scripts and openspec/cc-sdd dependencies from root package (task 6) ([202efaf](https://github.com/j5ik2o/takt-sdd/commit/202efaf7135398757adb1517182d0bfd3a00a62d))
* **retire-legacy-workflow-surface:** retire OpenSpec/cc-sdd init and shrink dependency propagation to takt (task 4) ([54d36a2](https://github.com/j5ik2o/takt-sdd/commit/54d36a2465ada27cb973ec81e61ede7dd4d9e993))
* **retire-legacy-workflow-surface:** shrink workflow preflight to takt-only dependency checks (task 3) ([649cff1](https://github.com/j5ik2o/takt-sdd/commit/649cff1ad7437d6e53f9d211b9e579f83ce63fbe))
* **takt-sdd-global-cli:** add isolated global install smoke test (task 5.2) ([6ca9d1e](https://github.com/j5ik2o/takt-sdd/commit/6ca9d1eaf336e76798c0486359a41994addf7e22))
* **takt-sdd-global-cli:** define public command catalog with exclusion classes and drift tests (task 3.1) ([8ca8f71](https://github.com/j5ik2o/takt-sdd/commit/8ca8f71cbaad246fd6a452de3cd218dd05fde0e5))
* **takt-sdd-global-cli:** extract installFromSource as asset-source-independent shared install core (task 1.1) ([2ae3c40](https://github.com/j5ik2o/takt-sdd/commit/2ae3c40b6b46a2f3009100ab2d1e8b64c553a2b3))
* **takt-sdd-global-cli:** implement catalog-driven package artifact validator (task 5.1) ([72b844f](https://github.com/j5ik2o/takt-sdd/commit/72b844fc962876de56404ca9bb4d2cc72109f443))
* **takt-sdd-global-cli:** implement init command with packaged asset source (task 3.2) ([8a83e5b](https://github.com/j5ik2o/takt-sdd/commit/8a83e5b16d1903146677c25e987981f2c4512434))
* **takt-sdd-global-cli:** implement workflow preflight and spawn runner (task 3.3) ([ac841c1](https://github.com/j5ik2o/takt-sdd/commit/ac841c1d0c811ae21d9e1feef31a5cd07621d87b))
* **takt-sdd-global-cli:** integrate CLI dispatch and shebang bin entry (task 4) ([fbb8e72](https://github.com/j5ik2o/takt-sdd/commit/fbb8e72418780ed2d725f2af8e8f437cc4d6b3b6))
* **takt-sdd-global-cli:** make root package publishable with bin, files allowlist, and build chain (task 2) ([899ef99](https://github.com/j5ik2o/takt-sdd/commit/899ef99727f1e088b3854a570be84bb0a8f956e7))
* **takt-sdd-global-cli:** replace devDependencies merge with SDD allowlist extraction (task 1.2) ([814d753](https://github.com/j5ik2o/takt-sdd/commit/814d75327e93a64a95513563c1f1f1ebd8fe885a))


### Bug Fixes

* **installer:** persist manifest before cc-sdd init ([311421f](https://github.com/j5ik2o/takt-sdd/commit/311421f65f1df217f75a8e55136cd33220f6f54c))
* **kiro-ai-quality-gate-workflow-coverage:** allow standalone design validation without gate report ([7c0ff72](https://github.com/j5ik2o/takt-sdd/commit/7c0ff7276fc4f6912dc8d1e8612cf000bc837567))
* **kiro-ai-quality-gate-workflow-coverage:** clarify quick gate evidence paths ([7fde3be](https://github.com/j5ik2o/takt-sdd/commit/7fde3be937744d55fac664549de1d1ff62b03e8a))
* **kiro-ai-quality-gate-workflow-coverage:** route loop monitors through spec gate ([7e5904d](https://github.com/j5ik2o/takt-sdd/commit/7e5904d1d2443b5dc884d824ad4698a945353ac9))
* **kiro-ai-quality-gate-workflow-coverage:** stop replan from local repair ([69afc3d](https://github.com/j5ik2o/takt-sdd/commit/69afc3d6ff52f38733ff89507c46d52971161a4f))
* **kiro-ai-quality-gate-workflow-coverage:** use namespaced spec gate evidence ([f996d9a](https://github.com/j5ik2o/takt-sdd/commit/f996d9a99c546478a5bb5ec20163f22c2f13000e))
* **kiro-discovery-batch-workflows:** abort discovery failures ([1e05315](https://github.com/j5ik2o/takt-sdd/commit/1e053155da988ad47338bb2406fdd95d676e423f))
* **kiro-discovery-batch-workflows:** align batch review routing ([b853595](https://github.com/j5ik2o/takt-sdd/commit/b853595f02461927a7cba2db1e885074f1f47175))
* **kiro-discovery-batch-workflows:** block invalid roadmap completion ([74b4536](https://github.com/j5ik2o/takt-sdd/commit/74b4536434f1a6ec14aa5b050fbae8633210f0e9))
* **kiro-discovery-batch-workflows:** block missing briefs before waves ([025620a](https://github.com/j5ik2o/takt-sdd/commit/025620a7e4913fe46d49322de6d3d7cd118f6c06))
* **kiro-discovery-batch-workflows:** clarify validation failures ([75e723b](https://github.com/j5ik2o/takt-sdd/commit/75e723b99cdcf146ae40409c0eecebb4054ca51b))
* **kiro-discovery-batch-workflows:** enforce batch review gates ([a99cef3](https://github.com/j5ik2o/takt-sdd/commit/a99cef34fdb5d9c476ce2e4294b37a2b8a18b3ce))
* **kiro-discovery-batch-workflows:** gate mixed discovery results ([7943471](https://github.com/j5ik2o/takt-sdd/commit/7943471d377d04f6bb177f307e7a126aec1f5af9))
* **kiro-discovery-batch-workflows:** preserve mixed discovery gates ([af76766](https://github.com/j5ik2o/takt-sdd/commit/af767662e0b58c5476d95f3ffe4538d61d1e4aaf))
* **kiro-discovery-batch-workflows:** prioritize discovery blocking guards ([993ff4b](https://github.com/j5ik2o/takt-sdd/commit/993ff4b581cedd15317d76a49d7c309b4d6be222))
* **kiro-discovery-batch-workflows:** reject duplicate roadmap specs ([70557fe](https://github.com/j5ik2o/takt-sdd/commit/70557fe4e70ac28e1d306f11521c6f1d9ae23ec7))
* **kiro-discovery-batch-workflows:** reject empty roadmap specs ([e120d28](https://github.com/j5ik2o/takt-sdd/commit/e120d28f232eda375ec2019306133d35a65b68df))
* **kiro-discovery-batch-workflows:** require non-empty mixed awareness items ([849e8b2](https://github.com/j5ik2o/takt-sdd/commit/849e8b2a05bc463854a5bde46bcd8d6e587ed6b0))
* **kiro-discovery-batch-workflows:** require roadmap in discovery reports ([d00c598](https://github.com/j5ik2o/takt-sdd/commit/d00c5984f51c9bc489b4ab7b980879f79e494183))
* **kiro-discovery-batch-workflows:** route incomplete discovery artifacts ([d5ffbd9](https://github.com/j5ik2o/takt-sdd/commit/d5ffbd9213403355f9cf3945400f14d2f66da8b1))
* **kiro-discovery-batch-workflows:** tighten discovery parity validation ([84c9878](https://github.com/j5ik2o/takt-sdd/commit/84c9878f3a9d7aa0a02ee4f9b70e1438109e39d4))
* **kiro-spec-batch:** restore ja/en parity for 'approvals' contract term ([878375b](https://github.com/j5ik2o/takt-sdd/commit/878375b246be0308fc589c1c54952b14701ac7ce))
* **kiro:** accept localized design headings ([7a830a9](https://github.com/j5ik2o/takt-sdd/commit/7a830a9d9b6b477cf14d96361ba292ffc3ab281a))
* **kiro:** align AI gate review routing vocabulary ([3978f9f](https://github.com/j5ik2o/takt-sdd/commit/3978f9f2fa2871e1331f06cf254bf1f6f4d50b52))
* **kiro:** clarify review condition mapping ([04324c2](https://github.com/j5ik2o/takt-sdd/commit/04324c23f10ca01fcf337105a891add2bd75e748))
* **kiro:** collapse task payload in `buildTaktArgs` and add test coverage ([c0aa8cb](https://github.com/j5ik2o/takt-sdd/commit/c0aa8cbe2ad1ef322d8fb9f0b70d4dd5cb8658a0))
* **kiro:** cover AI quality gate review fallbacks ([b4ebe61](https://github.com/j5ik2o/takt-sdd/commit/b4ebe61e3ae07c202651a1cfaf6763b4f435352c))
* **kiro:** generalize AI gate replan routing ([de6fea5](https://github.com/j5ik2o/takt-sdd/commit/de6fea5b51b50f8d9d5fad8bf9516d9ccd1cb84d))
* **kiro:** harden task review routing contracts ([88fd86e](https://github.com/j5ik2o/takt-sdd/commit/88fd86ea94506b5cc1a0029de31b49ec0879f8f9))
* **kiro:** include quality gate in parent loop monitor ([a1f876e](https://github.com/j5ik2o/takt-sdd/commit/a1f876e942310fec3b2a29fcca6d55a829bfaf76))
* **kiro:** keep implementation workflow iterating ([1264806](https://github.com/j5ik2o/takt-sdd/commit/126480686919d99296593e99dcb971666ce1d4bb))
* **kiro:** make quality gate workflow call runtime-safe ([5f54890](https://github.com/j5ik2o/takt-sdd/commit/5f548906453fe5e7a36d376f5be2b6a16b8c1fb0))
* **kiro:** make skill adapter source explicit ([e8bee9c](https://github.com/j5ik2o/takt-sdd/commit/e8bee9ce73f7d59fc5cb3a731ea847d0e0994d64))
* **kiro:** refresh task planning re-entry ([b0b2d6b](https://github.com/j5ik2o/takt-sdd/commit/b0b2d6b13bd5fc91eee0c525b24158d8753037fd))
* **kiro:** remove backend-specific reviewer knowledge ([a4b6b7e](https://github.com/j5ik2o/takt-sdd/commit/a4b6b7e66ee56a23af3b57e4c635df9b093dd762))
* **kiro:** remove unused frontmatter parser ([2421aff](https://github.com/j5ik2o/takt-sdd/commit/2421aff74f04d17966f87312d31589be214c7525))
* **kiro:** remove unused frontmatter parsers ([ccd0a0f](https://github.com/j5ik2o/takt-sdd/commit/ccd0a0fe67b5650a020635e618e1c8484f97b9ae))
* **kiro:** replan on AI quality gate loop exhaustion ([aebeda8](https://github.com/j5ik2o/takt-sdd/commit/aebeda8aa93249d6284270dcaa453ff496c507a5))
* **kiro:** tighten quality gate validation boundaries ([63db4de](https://github.com/j5ik2o/takt-sdd/commit/63db4de2dac09d14ba1a131a311060b7a339aaf0))
* **kiro:** treat AI quality gate fix report as optional ([567fec5](https://github.com/j5ik2o/takt-sdd/commit/567fec5fbbf0d5855fa69b3a42bf032db331eae4))
* **kiro:** unify reviewer verdict contracts ([89b8f67](https://github.com/j5ik2o/takt-sdd/commit/89b8f677b0614612be271c7f06605e840d1be5db))
* **kiro:** validate debug implementation evidence ([5d2085b](https://github.com/j5ik2o/takt-sdd/commit/5d2085ba10dcf932e9aabdd8ac525944f001d532))
* **kiro:** validate localized spec headings ([5fd319c](https://github.com/j5ik2o/takt-sdd/commit/5fd319c8b0f8cf909ea0038e4cf4a9b0f312efe6))
* **kiro:** validate reviewer adapter contracts ([2b61e48](https://github.com/j5ik2o/takt-sdd/commit/2b61e48073b1686202469457f31bf14afeabb529))
* **kiro:** verify AI quality gate fix status ([a8ee589](https://github.com/j5ik2o/takt-sdd/commit/a8ee5891f48e7c7f8aa2eb8be262dfa3b7a2648c))
* **retire-legacy-workflow-surface:** cover non-prefixed retired-exclusive facets in update cleanup ([ee82f83](https://github.com/j5ik2o/takt-sdd/commit/ee82f8371e04a2a3b05767bcc5f68000bf4eaa10))
* **retire-legacy-workflow-surface:** detect retired prefix on any facet path segment, not just basename ([f7d61d0](https://github.com/j5ik2o/takt-sdd/commit/f7d61d0eea528e9361d18e19f1a7a5b99e113fef))
* **retire-legacy-workflow-surface:** remove retired cc-sdd/opsx guidance and dead init messages from installer i18n ([d12c93e](https://github.com/j5ik2o/takt-sdd/commit/d12c93e383b48fe9c3b7a8585a53f71fd89ffc3b))
* **takt-sdd-global-cli:** align spec.json phase and tasks.md annotations with lifecycle validator ([63f5593](https://github.com/j5ik2o/takt-sdd/commit/63f5593e4f9b2a2f996fea9df0e83f7cba8fd155))
* **takt-sdd-global-cli:** include LICENSE files in package files allowlist ([4c6901a](https://github.com/j5ik2o/takt-sdd/commit/4c6901aa9a06efc5264f0c83625897ce6a17fde0))
* **test:** declare smoke fixture module type ([c50b8f4](https://github.com/j5ik2o/takt-sdd/commit/c50b8f414f638cbcf325c1691be9cfcd3d6a71a4))
* **test:** escape smoke fixture child path ([3fe2639](https://github.com/j5ik2o/takt-sdd/commit/3fe2639a1f89273db3b9dc4f9e55bea8e8c9d635))
* **test:** pass smoke workflow flags as args ([a497ae2](https://github.com/j5ik2o/takt-sdd/commit/a497ae22795c9f00eb6d6269735ec2669c689ea2))

## [1.1.0](https://github.com/j5ik2o/takt-sdd/compare/v0.19.1...v1.1.0) (2026-06-08)


### Features

* **kiro-shared-workflow-contracts:** add shared contracts ([ae2fbd3](https://github.com/j5ik2o/takt-sdd/commit/ae2fbd31e52c72af0c7dd248f158f9d82e78c649))
* **kiro-shared-workflow-contracts:** validate skill adapter contracts ([e8a16c3](https://github.com/j5ik2o/takt-sdd/commit/e8a16c320a72dee8ff7a9d3046ac4f12b8f1f4f3))
* **kiro-spec-generation-workflows:** add design workflow ([124d2ec](https://github.com/j5ik2o/takt-sdd/commit/124d2ecfbb279aa3f4a4b3f3611b9ceaaed333f9))
* **kiro-spec-generation-workflows:** add quick sanity contract ([744904d](https://github.com/j5ik2o/takt-sdd/commit/744904daed7ddcc91d6afe001500b5a030f3e573))
* **kiro-spec-generation-workflows:** add quick workflow ([b57e4e8](https://github.com/j5ik2o/takt-sdd/commit/b57e4e830443849f12b303cbf71844be0be78cf8))
* **kiro-spec-generation-workflows:** add requirements workflow ([f4ebc9d](https://github.com/j5ik2o/takt-sdd/commit/f4ebc9d4e8af1e5eb032914723d76c12d523a1cb))
* **kiro-spec-generation-workflows:** add shared phase contract ([a0362b4](https://github.com/j5ik2o/takt-sdd/commit/a0362b4c3587f928b519b95b6e6badf2f5765217))
* **kiro-spec-generation-workflows:** add spec init workflow ([f95ef02](https://github.com/j5ik2o/takt-sdd/commit/f95ef024c659ba0be36d2e0090454eb43678faaa))
* **kiro-spec-generation-workflows:** add tasks workflow ([5392c75](https://github.com/j5ik2o/takt-sdd/commit/5392c7525db3c0c7413dafefaecdc6a4a622fb7a))
* **kiro-spec-generation-workflows:** add validation harness ([40a6224](https://github.com/j5ik2o/takt-sdd/commit/40a6224cb3baeb47bc818a8ab87d7d9d01bca817))
* **kiro-spec-generation-workflows:** align spec generation facets with kiro skill adapters ([772f0b0](https://github.com/j5ik2o/takt-sdd/commit/772f0b08e0ca6f99a0554a9e84297f07e07f6dbe))
* **kiro-spec-generation-workflows:** complete final validation gates ([4e83f49](https://github.com/j5ik2o/takt-sdd/commit/4e83f49fb829651166b71266cecf84a549eea8ab))
* **kiro-spec-generation-workflows:** enforce kiro review field contracts ([f424057](https://github.com/j5ik2o/takt-sdd/commit/f424057f831d528c9b8834346f86ce380500f0b0))
* **kiro-spec-generation-workflows:** reject legacy kiro generation surfaces ([432e22b](https://github.com/j5ik2o/takt-sdd/commit/432e22b13a10a13272d53246048d938c9d0a19f4))
* **kiro-spec-generation-workflows:** validate generated artifacts ([3897546](https://github.com/j5ik2o/takt-sdd/commit/3897546d831130bc5e6dd5638fde95fc48603e4d))
* **kiro-spec-generation-workflows:** validate language parity ([7d62bb5](https://github.com/j5ik2o/takt-sdd/commit/7d62bb5da81af3c38ed5a55a13dbcdfa52696f40))
* **kiro-spec-generation-workflows:** validate lifecycle fixtures ([11da531](https://github.com/j5ik2o/takt-sdd/commit/11da531c69cc25c983b9f11b369d51eb64458836))
* **kiro-spec-generation-workflows:** wire validation scripts ([ef834e4](https://github.com/j5ik2o/takt-sdd/commit/ef834e4b1fca1d8a4322115e27643a597adda488))
* **kiro-status-validation-workflows:** add validation workflows ([04d986d](https://github.com/j5ik2o/takt-sdd/commit/04d986db2ebe223a711f66d4f076cc4afec4532c))
* **kiro-workflow-surface:** add canonical kiro scripts ([bdab31f](https://github.com/j5ik2o/takt-sdd/commit/bdab31fede750d6170ee005c41e21b6424755003))
* **kiro-workflow-surface:** add installer kiro scripts ([a1e9f47](https://github.com/j5ik2o/takt-sdd/commit/a1e9f47317c45f1e64c067081fbbbc9b7d41c430))
* **kiro-workflow-surface:** update root package metadata ([6f08a61](https://github.com/j5ik2o/takt-sdd/commit/6f08a6191f088487e46a715bf96ad879bb7927bc))
* **kiro-workflow-surface:** validate canonical Kiro public surface ([903180c](https://github.com/j5ik2o/takt-sdd/commit/903180c31e2c2d2214b73c44b2777a3b0b12aa16))
* **kiro-workflow-surface:** verify root script surface ([94f4b99](https://github.com/j5ik2o/takt-sdd/commit/94f4b99e24f9ed5fa7a8e5e474e37715587b0146))
* **kiro:** add iterative implementation workflow ([3c7c88f](https://github.com/j5ik2o/takt-sdd/commit/3c7c88f181c4ee1caa06cc40e414206a86c7c3b9))


### Bug Fixes

* **deps:** update dependency @fission-ai/openspec to v1.4.1 ([981eca6](https://github.com/j5ik2o/takt-sdd/commit/981eca6220d9d16c0905e7f33ebce08154563549))
* **installer:** align default archive version ([ec97598](https://github.com/j5ik2o/takt-sdd/commit/ec97598b1fbdbbbcbbdc1256199090116bcc844f))
* **installer:** exclude prereleases from latest fallback ([89eb44a](https://github.com/j5ik2o/takt-sdd/commit/89eb44aa7fad4ef25216a73fb29ae4e160cd481d))
* **installer:** fallback on default archive 403 ([9815791](https://github.com/j5ik2o/takt-sdd/commit/9815791490546c6cddcddbc3ae02b87b47d28782))
* **kiro-shared-workflow-contracts:** document kiro script mappings ([cc32113](https://github.com/j5ik2o/takt-sdd/commit/cc321138fe4e8886881f1ea189b38de009b49bb2))
* **kiro-shared-workflow-contracts:** run validation cli entrypoint ([d74cd07](https://github.com/j5ik2o/takt-sdd/commit/d74cd070b0963b51c629a31c06fb9347e8d29703))
* **kiro-spec-generation-workflows:** address quick validation gaps ([378f438](https://github.com/j5ik2o/takt-sdd/commit/378f438d958c6ae42ea2e6fa582cd58313b41ce8))
* **kiro-spec-generation-workflows:** allow initialized drafts ([75e598d](https://github.com/j5ik2o/takt-sdd/commit/75e598d4e76f2004f6f66caf0eda19d11cf670dc))
* **kiro-spec-generation-workflows:** close validation gaps ([af06073](https://github.com/j5ik2o/takt-sdd/commit/af06073fa88b7a8e8ea21a87f4d34ebb7ecf1d90))
* **kiro-spec-generation-workflows:** enforce quick phase parity ([2a17cda](https://github.com/j5ik2o/takt-sdd/commit/2a17cdaaa5c20255a94256f57be1c1ef78b0dcf0))
* **kiro-spec-generation-workflows:** match review terms exactly ([4ec6e19](https://github.com/j5ik2o/takt-sdd/commit/4ec6e19f7f628b0ef94a025c8626ca6a6ebe09c5))
* **kiro-spec-generation-workflows:** remove duplicate quick instruction ([0836c31](https://github.com/j5ik2o/takt-sdd/commit/0836c31eb93810c19c8ae9a7d456b0efb531fbed))
* **kiro-spec-generation-workflows:** require task reviews before auto completion ([00723a8](https://github.com/j5ik2o/takt-sdd/commit/00723a8fdeee3148a1b40d10d41e1cc57bac5ee7))
* **kiro-spec-generation-workflows:** scope quick sanity instruction ([fa1b881](https://github.com/j5ik2o/takt-sdd/commit/fa1b881d02aea194efbd517ca281a71d284befb1))
* **kiro-spec-generation-workflows:** split quick sanity instruction ([b904cea](https://github.com/j5ik2o/takt-sdd/commit/b904ceaffbde28ccd7bd95f4d7e0c0c9f628d700))
* **kiro-spec-generation-workflows:** use runtime permission mode ([02c9d44](https://github.com/j5ik2o/takt-sdd/commit/02c9d44b434e530ee28924f89b32ee5ceca23af4))
* **kiro-status-validation-workflows:** clarify readiness failures ([75532d7](https://github.com/j5ik2o/takt-sdd/commit/75532d79f3d699f0576650145275a9a0f4fe37bf))
* **kiro-status-validation-workflows:** harden validation routing ([7fe9e54](https://github.com/j5ik2o/takt-sdd/commit/7fe9e54384e53794bfd27cc2909db467d4dd2120))
* **kiro-status-validation-workflows:** include initialized artifacts ([1375c49](https://github.com/j5ik2o/takt-sdd/commit/1375c495819eacf1a5c93f7697e51bdf5e9c4b27))
* **kiro-status-validation-workflows:** prioritize status errors ([59c3b32](https://github.com/j5ik2o/takt-sdd/commit/59c3b32453014e86461471ebfddba30ff2365acb))
* **kiro-workflow-surface:** add staged kiro launcher ([4f28b6c](https://github.com/j5ik2o/takt-sdd/commit/4f28b6c8518b1606677b26d018ff6e12834b7c4d))
* **kiro-workflow-surface:** address Devin review findings ([bb7fc7d](https://github.com/j5ik2o/takt-sdd/commit/bb7fc7dd783a95ff47a3ae082358414f54da23a2))
* **kiro-workflow-surface:** address PR review comments ([3607903](https://github.com/j5ik2o/takt-sdd/commit/3607903a6602c4bd60627f4a5a31db7441ce081b))
* **kiro-workflow-surface:** align spec review traces ([24f7d8c](https://github.com/j5ik2o/takt-sdd/commit/24f7d8ce57dfe0371da4f33ea4fca2c8ec242543))
* **kiro-workflow-surface:** align validation contracts ([3b81ba1](https://github.com/j5ik2o/takt-sdd/commit/3b81ba1e89691d2bc8ad45c4006f6100bbefaf5d))
* **kiro-workflow-surface:** align validation harness coverage ([2245582](https://github.com/j5ik2o/takt-sdd/commit/2245582ec8366a3b6f42f06062bb2f0b31783d3e))
* **kiro-workflow-surface:** clarify batch summary ownership ([8eec5f3](https://github.com/j5ik2o/takt-sdd/commit/8eec5f3dd1b42624b44d0f52785032621b1a98b3))
* **kiro-workflow-surface:** clarify discovery batch prerequisites ([064dfdd](https://github.com/j5ik2o/takt-sdd/commit/064dfddb97e1f9bda5d30a8c0b7016fa4e9926e4))
* **kiro-workflow-surface:** clarify implementation review gate ([0e49d7a](https://github.com/j5ik2o/takt-sdd/commit/0e49d7a6a6d32df321fecd53ab34c7d5b51ed1a2))
* **kiro-workflow-surface:** cover facet inheritance validation ([ec826bb](https://github.com/j5ik2o/takt-sdd/commit/ec826bb946a6d71f268343936b473762789eddcc))
* **kiro-workflow-surface:** defer batch readiness ([8a1c6ad](https://github.com/j5ik2o/takt-sdd/commit/8a1c6ad35248d8913dfedaa515c4b3d6a053f2da))
* **kiro-workflow-surface:** install staged launcher from asset ([fb6eaf0](https://github.com/j5ik2o/takt-sdd/commit/fb6eaf0dfa62961ebac485e4c5122214bb89670d))
* **kiro-workflow-surface:** order discovery batch review tasks ([6a3e4f3](https://github.com/j5ik2o/takt-sdd/commit/6a3e4f3b726776176d529849e6be6f897dc60c66))
* **kiro-workflow-surface:** preserve staged launcher args ([64fdaef](https://github.com/j5ik2o/takt-sdd/commit/64fdaef3f39537eb6101d99c2d9ef2f052bf2aab))
* **kiro-workflow-surface:** separate generation verdict shape ([623909b](https://github.com/j5ik2o/takt-sdd/commit/623909bc644fcf814d9f004f7b282c2fc0422272))
* **kiro-workflow-surface:** validate legacy workflow identities exactly ([1afa6da](https://github.com/j5ik2o/takt-sdd/commit/1afa6da41380397ba6bcd2e51b71a81465351f2f))
* **kiro-workflow-surface:** validate migration table rows exactly ([b2d32f9](https://github.com/j5ik2o/takt-sdd/commit/b2d32f91cade7e676234fdc6360b193cd0356eb1))
* **kiro:** add requirements workflow step headroom ([f91323a](https://github.com/j5ik2o/takt-sdd/commit/f91323a7d88f77e35d5fcf23bbf4a1df51b0e268))
* **kiro:** add task set routing field ([0dd9951](https://github.com/j5ik2o/takt-sdd/commit/0dd9951734d41a9701ac9efa8cf3e154d6431e99))
* **kiro:** add tasks review contract ([648eaba](https://github.com/j5ik2o/takt-sdd/commit/648eaba65be2390766e35e6c8f0ce6d349e45672))
* **kiro:** address workflow review adapter drift ([a61c795](https://github.com/j5ik2o/takt-sdd/commit/a61c795631c42261b79ae01369a010f232b37efd))
* **kiro:** align adapters with read-only gates ([7161757](https://github.com/j5ik2o/takt-sdd/commit/71617574cc94a9f6fddef4c593c4ca35aba84188))
* **kiro:** align completion and design validators ([6d69c87](https://github.com/j5ik2o/takt-sdd/commit/6d69c8764da5dd3839ed38c4254b005aed9dd0d1))
* **kiro:** align implementation workflow routing ([fa29827](https://github.com/j5ik2o/takt-sdd/commit/fa29827dffd6b041f9a5764c391f64563030b229))
* **kiro:** align requirements review result contract ([4c0febf](https://github.com/j5ik2o/takt-sdd/commit/4c0febfb6bfceaa4a6eac2d0a98ba5456e3d85d3))
* **kiro:** align requirements review section heading ([c87af75](https://github.com/j5ik2o/takt-sdd/commit/c87af75707e4397df62df3ae2f0201aaac153d68))
* **kiro:** align review gates with contracts ([34bc884](https://github.com/j5ik2o/takt-sdd/commit/34bc8849727c0ccda47628052d1422b848877969))
* **kiro:** align task generation result routing ([09eb2b5](https://github.com/j5ik2o/takt-sdd/commit/09eb2b5673e64d9c42290d47c53cdbd570427260))
* **kiro:** align task review and skill sections ([cb01a5e](https://github.com/j5ik2o/takt-sdd/commit/cb01a5e70f3088ad547eca5d48cdd5adb0d817c6))
* **kiro:** align validation decision contracts ([441880f](https://github.com/j5ik2o/takt-sdd/commit/441880fdb96b8d1ced80c4e1dbb6adef09ac28b8))
* **kiro:** clarify draft artifact review flow ([c420cee](https://github.com/j5ik2o/takt-sdd/commit/c420cee611f73385c9528e2f47b5ea1ce8aae80b))
* **kiro:** clarify draft generation result pass semantics ([7dd9605](https://github.com/j5ik2o/takt-sdd/commit/7dd9605d9a87205db47f6087ab26a8fc9b4254de))
* **kiro:** close quick spec generation loops ([344d630](https://github.com/j5ik2o/takt-sdd/commit/344d63008a11a23c96320001c72ac48e8cfae385))
* **kiro:** close spec generation review loops ([7b3b36f](https://github.com/j5ik2o/takt-sdd/commit/7b3b36f2ed78ad002bff43d26896f3013596ab0f))
* **kiro:** cover quoted frontmatter parsing ([d59c800](https://github.com/j5ik2o/takt-sdd/commit/d59c800c5ec933e9042d5dcb6718a641a2058329))
* **kiro:** define draft review routing fields ([3c80e07](https://github.com/j5ik2o/takt-sdd/commit/3c80e0757bd72ba7cb3196ab419a5993b06df9ee))
* **kiro:** disambiguate generation result statuses ([3f2862d](https://github.com/j5ik2o/takt-sdd/commit/3f2862d50474deed5c6d104500db3d068c39720f))
* **kiro:** document debug retry eligibility ([3b21a8d](https://github.com/j5ik2o/takt-sdd/commit/3b21a8d65a2712c64525dcfbd6c11a811b5da62a))
* **kiro:** enforce monitored workflow shapes ([47ef336](https://github.com/j5ik2o/takt-sdd/commit/47ef336313801613b95471eb21e27163b8996dee))
* **kiro:** enforce status validation contracts ([29bbe44](https://github.com/j5ik2o/takt-sdd/commit/29bbe4451446fbfce36bd7203ecc2f63d6ad9f60))
* **kiro:** enforce workflow field contracts ([d6d52e7](https://github.com/j5ik2o/takt-sdd/commit/d6d52e7b29c9d379cec7c6753e73e7f38488ae21))
* **kiro:** finalize spec generation after review ([3ba5589](https://github.com/j5ik2o/takt-sdd/commit/3ba55894fc5adce1389e2bda1837522450c2dd91))
* **kiro:** harden skill field validation ([4f26478](https://github.com/j5ik2o/takt-sdd/commit/4f2647810ba3c332f6291019f938c3f7b5b203b2))
* **kiro:** normalize design validation decisions ([af4e983](https://github.com/j5ik2o/takt-sdd/commit/af4e9835d2b30062fb72a9e26769fc69a1837950))
* **kiro:** remove duplicate workflow surface archive ([aa7ef57](https://github.com/j5ik2o/takt-sdd/commit/aa7ef57c5f2fcda13bb984c08791f0d70bf1fe8b))
* **kiro:** restore script verification dependency ([2cebf9d](https://github.com/j5ik2o/takt-sdd/commit/2cebf9d8a6528e9669a20182e42f41142dcc8f82))
* **kiro:** route drafts through review gates ([49370ae](https://github.com/j5ik2o/takt-sdd/commit/49370aeb1d736748201c953071d14baf9915ca81))
* **kiro:** separate draft and finalize instructions ([c1764e4](https://github.com/j5ik2o/takt-sdd/commit/c1764e4fdf717117113bda111f5563bb2cc385b1))
* **kiro:** separate manual verification reasons ([089db25](https://github.com/j5ik2o/takt-sdd/commit/089db2525b021094852aa1dc155e1a21c422c83b))
* **kiro:** simplify status validation export ([43c2fe8](https://github.com/j5ik2o/takt-sdd/commit/43c2fe86b32aa5f394c1c34691c58c1a0e96ea2e))
* **kiro:** tighten implementation workflow contracts ([14623c9](https://github.com/j5ik2o/takt-sdd/commit/14623c91922a65f0f1f81b1aee7f64db463d51a3))
* **kiro:** update completion status design wording ([577223d](https://github.com/j5ik2o/takt-sdd/commit/577223d1a004914fbd6a70ddc250649be9965ecb))
* **kiro:** update completion status task wording ([8612b22](https://github.com/j5ik2o/takt-sdd/commit/8612b221c67c71d9d556775ca5c1850ec47272b7))
* **kiro:** use phase-specific review adapters ([e261dc2](https://github.com/j5ik2o/takt-sdd/commit/e261dc2b681d121c085d923b1cc18ad9faab4896))
* **kiro:** use review adapter for tasks gate ([6c4fa12](https://github.com/j5ik2o/takt-sdd/commit/6c4fa12d9cf256c7872df8ac3e8ec8222ef28657))
* **kiro:** validate generation draft routing fields ([d3914fe](https://github.com/j5ik2o/takt-sdd/commit/d3914feebf7979ab9e5e4f97fc73599925126fc2))

## [0.19.1](https://github.com/j5ik2o/takt-sdd/compare/v0.19.0...v0.19.1) (2026-05-26)


### Bug Fixes

* align ai review verdict rules ([1f41900](https://github.com/j5ik2o/takt-sdd/commit/1f419001768397b8e68ffd00ff8c727d37ab6765))
* align english ai fix verdict rules ([c9fdaea](https://github.com/j5ik2o/takt-sdd/commit/c9fdaea559b5b3dbde9b3467e3961c4fe7867884))
* align english opsx validation verdicts ([c21cd29](https://github.com/j5ik2o/takt-sdd/commit/c21cd297c9eca9c5f86b1401d1325df31f61fcd4))
* align openspec workflow validation contracts ([686d6f6](https://github.com/j5ik2o/takt-sdd/commit/686d6f6c79fe0c9ca773dd02db2ec491b73216b3))

## [0.19.0](https://github.com/j5ik2o/takt-sdd/compare/v0.18.2...v0.19.0) (2026-05-26)


### Features

* **installer:** use official openspec cli ([e96bac7](https://github.com/j5ik2o/takt-sdd/commit/e96bac7cdb333e4f1bcdbbc3b040af08431a135d))


### Bug Fixes

* **installer:** address review comments ([d1d0587](https://github.com/j5ik2o/takt-sdd/commit/d1d0587f89030971f36558529e284f4899f0ddba))
* **installer:** align tagged openspec setup ([7a20ca5](https://github.com/j5ik2o/takt-sdd/commit/7a20ca5dcd142dae1fa4049d6ee8939ba0740b49))
* **installer:** preserve openspec config on update ([c6f384f](https://github.com/j5ik2o/takt-sdd/commit/c6f384ffa0435902e7db8b73186fe7f1a3bb1572))
* **installer:** recover partial openspec init ([46da2c9](https://github.com/j5ik2o/takt-sdd/commit/46da2c9549d0b490789137795b6d93da3b9b93e7))

## [0.18.2](https://github.com/j5ik2o/takt-sdd/compare/v0.18.1...v0.18.2) (2026-05-21)


### Bug Fixes

* **installer:** add node types for TypeScript 6 build ([e9b0cfa](https://github.com/j5ik2o/takt-sdd/commit/e9b0cfa7843dd5d9e3362574dd2b5efde17cd24d))

## [0.18.1](https://github.com/j5ik2o/takt-sdd/compare/v0.18.0...v0.18.1) (2026-04-26)


### Bug Fixes

* CI で Persona file path エラーを期待されるエラーとして扱う ([074e16e](https://github.com/j5ik2o/takt-sdd/commit/074e16e7adc09348a0867381bdc10a96a61dc08e))
* clarify missing opsx script error ([c986452](https://github.com/j5ik2o/takt-sdd/commit/c98645215eb24ffcfef264b2b38bb3feff8c9bc5))
* install opsx cli script with workflows ([63daf9c](https://github.com/j5ik2o/takt-sdd/commit/63daf9c14e28b67c6b8a65bd34e1f8da679486f5))
* installer と CI の pieces → workflows 対応 ([d6b7446](https://github.com/j5ik2o/takt-sdd/commit/d6b744698edf98b9bae0e4f63966c7886cc9da30))
* require opsx installer script in release ([b81924c](https://github.com/j5ik2o/takt-sdd/commit/b81924c54d10b33d14a1942b4083164ff2b60aff))
* レビュー指摘対応 - 変数名を pieces→workflows に統一 ([0b4abb5](https://github.com/j5ik2o/takt-sdd/commit/0b4abb56df02d2f0736983e0fca439a9fa6b620c))

## [0.18.0](https://github.com/j5ik2o/takt-sdd/compare/v0.17.0...v0.18.0) (2026-04-16)


### Features

* **skills:** add `skills-lock.json` for managing skill dependencies ([777cd24](https://github.com/j5ik2o/takt-sdd/commit/777cd2483652e54ce33330b9094c2b702d19d043))

## [0.17.0](https://github.com/j5ik2o/takt-sdd/compare/v0.16.0...v0.17.0) (2026-04-15)


### Features

* **agents:** add Takt skill directories for modular functionality ([4e1c390](https://github.com/j5ik2o/takt-sdd/commit/4e1c39060b10c7d204d4e364fef943c3f4cfef90))
* **agents:** introduce policies and personas for Takt facet builder ([af73f98](https://github.com/j5ik2o/takt-sdd/commit/af73f988f0a41ddc896cf065eeb59345f36335fd))
* **workflows:** add experimental OPSX commands for advanced task management ([aaf390a](https://github.com/j5ik2o/takt-sdd/commit/aaf390a32bc7fc974f0e3e77c7d8b8126e425ee2))

## [0.16.0](https://github.com/j5ik2o/takt-sdd/compare/v0.15.1...v0.16.0) (2026-03-19)


### Features

* **agents:** add initial Codex agent directories ([ec8a3a1](https://github.com/j5ik2o/takt-sdd/commit/ec8a3a1ea190bf220d5cfbb5184030dfba96aaf8))
* **config:** add `.mcp.json` for MCP server configuration ([b85d4f8](https://github.com/j5ik2o/takt-sdd/commit/b85d4f80f8f60fabd177601d785e50b75aea1e4a))
* **config:** add `mise.toml` for tool version management ([acb2eea](https://github.com/j5ik2o/takt-sdd/commit/acb2eea2676783311fbf93da7b82403b08957aa5))
* **config:** add Serena configuration and update ignore files ([1499008](https://github.com/j5ik2o/takt-sdd/commit/1499008d8734b8119e92960ff8f7b8a2fb11af6b))
* **config:** enhance Codex configuration with advanced settings ([69ece37](https://github.com/j5ik2o/takt-sdd/commit/69ece376bb59cb55131edf6ca1f4a3c2bbf2aa8f))
* **config:** extend project configuration with memory and line ending settings ([6bcdcde](https://github.com/j5ik2o/takt-sdd/commit/6bcdcde27b064ef35a494e1c5ca774f9aee30d9e))
* **config:** unify and update Codex configuration files ([594c0bc](https://github.com/j5ik2o/takt-sdd/commit/594c0bc8fd9d2918c4d7197d15ff8ef47a9fe4f9))
* **rules:** add guidelines for naming clarity, immutability, and pre-coding learning ([bc07a13](https://github.com/j5ik2o/takt-sdd/commit/bc07a13a9f376d0000e0683be3c1d29e606f20fc))


### Bug Fixes

* **ci:** add git pull --rebase before push in release workflow ([eef1982](https://github.com/j5ik2o/takt-sdd/commit/eef19823dfbbadb2d303c1eea71fbf225d4ae9a7))

## [0.15.1](https://github.com/j5ik2o/takt-sdd/compare/v0.15.0...v0.15.1) (2026-03-16)


### Bug Fixes

* drop removed create-worktree flag ([bf8d92a](https://github.com/j5ik2o/takt-sdd/commit/bf8d92a558e13790036d434b7810bbfa257abba4))

## [0.15.0](https://github.com/j5ik2o/takt-sdd/compare/v0.14.0...v0.15.0) (2026-03-09)


### Features

* add detailed requirements review process and tooling ([ce6836c](https://github.com/j5ik2o/takt-sdd/commit/ce6836c2b8da90ae4cbb14578d3679ba5d8fa880))
* add Serena configuration for qcount project ([2500ac8](https://github.com/j5ik2o/takt-sdd/commit/2500ac86c849c3eafc54a68e488a68321010f251))
* add takt-task skill for creating TAKT `tasks.yaml` and task directories ([b2a24a6](https://github.com/j5ik2o/takt-sdd/commit/b2a24a641d6bd08e5c6730043e1c7c9837d6a24b))
* **takt-piece:** improve skill with discriminating assertions and edit:false safety ([1599ed7](https://github.com/j5ik2o/takt-sdd/commit/1599ed78f767a6ef35298bfdeff1be242ce36fc8))
* update all takt-* skills to support takt v0.30.0 changes ([48b367e](https://github.com/j5ik2o/takt-sdd/commit/48b367e4219e3f6899176a01132a1787524b74c0))


### Bug Fixes

* regenerate package-lock.json to lock takt at v0.30.0 ([117d592](https://github.com/j5ik2o/takt-sdd/commit/117d5920b16ee1cd7c00822074e809162c655318))

## [0.14.0](https://github.com/j5ik2o/takt-sdd/compare/v0.13.0...v0.14.0) (2026-03-04)


### Features

* add log-based diagnostic analysis to takt-analyze and enforce SRP with takt-optimize ([b8975f3](https://github.com/j5ik2o/takt-sdd/commit/b8975f39ae995b205ff97303596a8df50c3d20e2))
* reviewersをcc-sdd-impl/fullからopsx-apply/fullに移動 ([4b588ac](https://github.com/j5ik2o/takt-sdd/commit/4b588ac937556374f19a4e0f8b0092d5a293a773))

## [0.13.0](https://github.com/j5ik2o/takt-sdd/compare/v0.12.0...v0.13.0) (2026-03-04)


### Features

* add parallel execution strategy guidance to takt-task skill ([2c2afcf](https://github.com/j5ik2o/takt-sdd/commit/2c2afcf066dc623045cee9c7f1a65cbe7cb543a0))
* add takt-skill-updater skill ([e36121d](https://github.com/j5ik2o/takt-sdd/commit/e36121d10aac0cd4beed610d48ea923ae302c4db))


### Bug Fixes

* correct symlink paths and drain HTTP responses in installer ([4b42559](https://github.com/j5ik2o/takt-sdd/commit/4b42559c08fea21c051d2ffafdd08b65c1b638bb))
* update stale `.agent/` paths to `.agents/` in i18n messages ([7697528](https://github.com/j5ik2o/takt-sdd/commit/7697528511c170540f552c2368a652d40dc2f073)), closes [#26](https://github.com/j5ik2o/takt-sdd/issues/26) [#27](https://github.com/j5ik2o/takt-sdd/issues/27)

## [0.12.0](https://github.com/j5ik2o/takt-sdd/compare/v0.11.0...v0.12.0) (2026-03-02)


### Features

* add edit=false/supervise/CI責任配置に関するチェック項目と設計ガイドラインをSKILL.mdに追加 ([99a67dd](https://github.com/j5ik2o/takt-sdd/commit/99a67ddd2f00e37286e1e2e06c3758259f8dbd74))

## [0.11.0](https://github.com/j5ik2o/takt-sdd/compare/v0.10.1...v0.11.0) (2026-02-28)


### Features

* add capture movement to opsx-explore for exploration memo output ([28024bb](https://github.com/j5ik2o/takt-sdd/commit/28024bb0ee011386dce098d6681e1575f46de107))
* add opsx workflow pieces and replace openspec CLI with opsx-cli.sh ([a2d0666](https://github.com/j5ik2o/takt-sdd/commit/a2d0666c20f39f7f3343abb8a40ce3d30fa812b8))
* add opsx-explore piece for interactive thinking and investigation ([aede6bd](https://github.com/j5ik2o/takt-sdd/commit/aede6bd5b25d786db54aa54c1983d1961a3d12f5))
* add parallel reviewers and arbitration to cc-sdd-impl ([20a5cad](https://github.com/j5ik2o/takt-sdd/commit/20a5cad10028c41acdeca3bc6cc61d56c6bd2d60))
* add qcount test project skeleton for OpenSpec workflow testing ([bcd79f7](https://github.com/j5ik2o/takt-sdd/commit/bcd79f7846c838bae9580d961616a7f84c173a9a))
* add spec.json check and update handling to cc-sdd instruction facets ([ec9f26e](https://github.com/j5ik2o/takt-sdd/commit/ec9f26e51c5930403c5af10adaa08072552700d0))
* add standalone validate-impl phase to cc-sdd-full ([568cc70](https://github.com/j5ik2o/takt-sdd/commit/568cc70f6fe3520d06b886713136385e891595c9))
* redesign opsx-apply with batch execution and review pipeline ([530e680](https://github.com/j5ik2o/takt-sdd/commit/530e6807de3976c0b138af103aa2af163c7200cf))


### Bug Fixes

* address review findings - stale piece name, wrong dir path, dead code ([a59c2b4](https://github.com/j5ik2o/takt-sdd/commit/a59c2b4f31f504ceddcacd335ceef41da8831987))
* guard empty changes array in cmd_list JSON path for bash < 4.4 ([f3fd07c](https://github.com/j5ik2o/takt-sdd/commit/f3fd07c94b2dbecf350c0c83527b87b94ac36bfb))
* update cc-sdd steering facet paths and add openspec section to COMMON.md ([508c1f2](https://github.com/j5ik2o/takt-sdd/commit/508c1f221f1de33a5aa29160d1b3f8891f746c83))
* use || true instead of || echo "0" for grep -c in opsx-cli.sh ([faec7b8](https://github.com/j5ik2o/takt-sdd/commit/faec7b8ad9c4eb97680f8799bc50e44d1faba185))

## [0.10.1](https://github.com/j5ik2o/takt-sdd/compare/v0.10.0...v0.10.1) (2026-02-25)


### Bug Fixes

* align loop monitor healthy transitions with cycle head ([9b29629](https://github.com/j5ik2o/takt-sdd/commit/9b29629a3f7c6b3a49c0a5d52f05f029317d9e60))
* update takt skills and add workflow validators ([b21d813](https://github.com/j5ik2o/takt-sdd/commit/b21d8130b7863458f0c1e4b683d2c86a496878ef))

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

