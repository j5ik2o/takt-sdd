use crate::context_line::ContextLine;
use crate::context_window::ContextWindow;

pub struct ContextSlicePolicy;

impl ContextSlicePolicy {
    pub fn slice(
        lines: &[String],
        matched_index: usize,
        context_window: ContextWindow,
    ) -> (Vec<ContextLine>, Vec<ContextLine>) {
        let before_context = build_before_context(lines, matched_index, context_window.before());
        let after_context = build_after_context(lines, matched_index, context_window.after());
        (before_context, after_context)
    }
}

fn build_before_context(
    lines: &[String],
    matched_index: usize,
    before_count: usize,
) -> Vec<ContextLine> {
    if before_count == 0 {
        return Vec::new();
    }

    let start_index = matched_index.saturating_sub(before_count);
    (start_index..matched_index)
        .map(|line_index| ContextLine::new(line_index + 1, lines[line_index].clone()))
        .collect()
}

fn build_after_context(
    lines: &[String],
    matched_index: usize,
    after_count: usize,
) -> Vec<ContextLine> {
    if after_count == 0 {
        return Vec::new();
    }

    let end_index = lines.len().min(matched_index + after_count + 1);
    ((matched_index + 1)..end_index)
        .map(|line_index| ContextLine::new(line_index + 1, lines[line_index].clone()))
        .collect()
}

#[cfg(test)]
mod tests {
    use crate::context_slice_policy::ContextSlicePolicy;
    use crate::context_window::ContextWindow;

    #[test]
    fn clips_context_at_head_and_tail_boundaries() {
        let lines = vec![
            "line-1".to_string(),
            "line-2".to_string(),
            "line-3".to_string(),
            "line-4".to_string(),
        ];

        let (before_first, after_first) =
            ContextSlicePolicy::slice(&lines, 0, ContextWindow::new(2, 2));
        assert!(before_first.is_empty());
        assert_eq!(after_first.len(), 2);
        assert_eq!(after_first[0].line_number(), 2);
        assert_eq!(after_first[1].line_number(), 3);

        let (before_last, after_last) =
            ContextSlicePolicy::slice(&lines, 3, ContextWindow::new(2, 2));
        assert_eq!(before_last.len(), 2);
        assert_eq!(before_last[0].line_number(), 2);
        assert_eq!(before_last[1].line_number(), 3);
        assert!(after_last.is_empty());
    }

    #[test]
    fn returns_no_context_when_window_is_zero() {
        let lines = vec!["match".to_string()];
        let (before, after) = ContextSlicePolicy::slice(&lines, 0, ContextWindow::new(0, 0));

        assert!(before.is_empty());
        assert!(after.is_empty());
    }

    #[test]
    fn clips_both_context_sides_when_requested_window_exceeds_available_lines() {
        let lines = vec![
            "line-1".to_string(),
            "line-2".to_string(),
            "line-3".to_string(),
            "line-4".to_string(),
            "line-5".to_string(),
        ];

        let (before, after) = ContextSlicePolicy::slice(&lines, 2, ContextWindow::new(10, 10));

        let before_pairs = before
            .iter()
            .map(|context_line| (context_line.line_number(), context_line.line().to_string()))
            .collect::<Vec<_>>();
        let after_pairs = after
            .iter()
            .map(|context_line| (context_line.line_number(), context_line.line().to_string()))
            .collect::<Vec<_>>();

        assert_eq!(
            before_pairs,
            vec![(1, "line-1".to_string()), (2, "line-2".to_string())]
        );
        assert_eq!(
            after_pairs,
            vec![(4, "line-4".to_string()), (5, "line-5".to_string())]
        );
    }
}
