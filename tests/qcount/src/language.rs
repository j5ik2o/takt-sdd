use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize)]
pub enum Language {
    Rust,
    Go,
    Python,
    JavaScript,
    TypeScript,
    Java,
    C,
    Cpp,
    Ruby,
    Shell,
    Yaml,
    Toml,
}

pub struct LanguageDef {
    pub name: &'static str,
    pub extensions: &'static [&'static str],
    pub line_comment: &'static [&'static str],
    pub block_comment_start: Option<&'static str>,
    pub block_comment_end: Option<&'static str>,
}

pub static LANGUAGE_DEFS: &[(Language, LanguageDef)] = &[
    (
        Language::Rust,
        LanguageDef {
            name: "Rust",
            extensions: &["rs"],
            line_comment: &["//"],
            block_comment_start: Some("/*"),
            block_comment_end: Some("*/"),
        },
    ),
    (
        Language::Go,
        LanguageDef {
            name: "Go",
            extensions: &["go"],
            line_comment: &["//"],
            block_comment_start: Some("/*"),
            block_comment_end: Some("*/"),
        },
    ),
    (
        Language::Python,
        LanguageDef {
            name: "Python",
            extensions: &["py"],
            line_comment: &["#"],
            block_comment_start: None,
            block_comment_end: None,
        },
    ),
    (
        Language::JavaScript,
        LanguageDef {
            name: "JavaScript",
            extensions: &["js", "mjs"],
            line_comment: &["//"],
            block_comment_start: Some("/*"),
            block_comment_end: Some("*/"),
        },
    ),
    (
        Language::TypeScript,
        LanguageDef {
            name: "TypeScript",
            extensions: &["ts"],
            line_comment: &["//"],
            block_comment_start: Some("/*"),
            block_comment_end: Some("*/"),
        },
    ),
    (
        Language::Java,
        LanguageDef {
            name: "Java",
            extensions: &["java"],
            line_comment: &["//"],
            block_comment_start: Some("/*"),
            block_comment_end: Some("*/"),
        },
    ),
    (
        Language::C,
        LanguageDef {
            name: "C",
            extensions: &["c", "h"],
            line_comment: &["//"],
            block_comment_start: Some("/*"),
            block_comment_end: Some("*/"),
        },
    ),
    (
        Language::Cpp,
        LanguageDef {
            name: "C++",
            extensions: &["cpp", "cc", "cxx", "hpp"],
            line_comment: &["//"],
            block_comment_start: Some("/*"),
            block_comment_end: Some("*/"),
        },
    ),
    (
        Language::Ruby,
        LanguageDef {
            name: "Ruby",
            extensions: &["rb"],
            line_comment: &["#"],
            block_comment_start: None,
            block_comment_end: None,
        },
    ),
    (
        Language::Shell,
        LanguageDef {
            name: "Shell",
            extensions: &["sh"],
            line_comment: &["#"],
            block_comment_start: None,
            block_comment_end: None,
        },
    ),
    (
        Language::Yaml,
        LanguageDef {
            name: "YAML",
            extensions: &["yaml", "yml"],
            line_comment: &["#"],
            block_comment_start: None,
            block_comment_end: None,
        },
    ),
    (
        Language::Toml,
        LanguageDef {
            name: "TOML",
            extensions: &["toml"],
            line_comment: &["#"],
            block_comment_start: None,
            block_comment_end: None,
        },
    ),
];

pub fn language_from_extension(ext: &str) -> Option<&'static Language> {
    for (lang, def) in LANGUAGE_DEFS {
        if def.extensions.contains(&ext) {
            return Some(lang);
        }
    }
    None
}

pub fn language_def(lang: &Language) -> Option<&'static LanguageDef> {
    for (l, def) in LANGUAGE_DEFS {
        if l == lang {
            return Some(def);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extension_mapping() {
        assert_eq!(language_from_extension("rs"), Some(&Language::Rust));
        assert_eq!(language_from_extension("py"), Some(&Language::Python));
        assert_eq!(language_from_extension("go"), Some(&Language::Go));
        assert_eq!(language_from_extension("js"), Some(&Language::JavaScript));
        assert_eq!(language_from_extension("ts"), Some(&Language::TypeScript));
        assert_eq!(language_from_extension("java"), Some(&Language::Java));
        assert_eq!(language_from_extension("c"), Some(&Language::C));
        assert_eq!(language_from_extension("cpp"), Some(&Language::Cpp));
        assert_eq!(language_from_extension("rb"), Some(&Language::Ruby));
        assert_eq!(language_from_extension("sh"), Some(&Language::Shell));
        assert_eq!(language_from_extension("yaml"), Some(&Language::Yaml));
        assert_eq!(language_from_extension("toml"), Some(&Language::Toml));
        assert_eq!(language_from_extension("unknown"), None);
    }
}
