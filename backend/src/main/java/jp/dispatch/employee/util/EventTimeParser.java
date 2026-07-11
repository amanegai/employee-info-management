package jp.dispatch.employee.util;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class EventTimeParser {

    private static final Pattern RANGE_PATTERN = Pattern.compile(
            "(\\d{1,2}:\\d{2})\\s*[-~～―—至到\\s]+\\s*(\\d{1,2}:\\d{2})"
    );
    private static final Pattern SINGLE_PATTERN = Pattern.compile("(\\d{1,2}:\\d{2})");

    private EventTimeParser() {
    }

    public static boolean overlaps(String left, String right) {
        Optional<TimeRange> leftRange = parse(left);
        Optional<TimeRange> rightRange = parse(right);
        if (leftRange.isEmpty() || rightRange.isEmpty()) {
            return true;
        }
        return leftRange.get().overlaps(rightRange.get());
    }

    public static Optional<TimeRange> parse(String eventTime) {
        if (eventTime == null || eventTime.isBlank()) {
            return Optional.empty();
        }
        String trimmed = eventTime.trim();
        Matcher rangeMatcher = RANGE_PATTERN.matcher(trimmed);
        if (rangeMatcher.find()) {
            LocalTime start = parseTime(rangeMatcher.group(1));
            LocalTime end = parseTime(rangeMatcher.group(2));
            if (start == null || end == null) {
                return Optional.empty();
            }
            if (!start.isBefore(end)) {
                return Optional.empty();
            }
            return Optional.of(new TimeRange(start, end));
        }
        Matcher singleMatcher = SINGLE_PATTERN.matcher(trimmed);
        if (singleMatcher.find()) {
            LocalTime start = parseTime(singleMatcher.group(1));
            if (start == null) {
                return Optional.empty();
            }
            return Optional.of(new TimeRange(start, start.plusHours(1)));
        }
        return Optional.empty();
    }

    private static LocalTime parseTime(String value) {
        try {
            return LocalTime.parse(value, DateTimeFormatter.ofPattern("H:mm"));
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    public record TimeRange(LocalTime start, LocalTime end) {
        public boolean overlaps(TimeRange other) {
            return start.isBefore(other.end) && other.start.isBefore(end);
        }
    }
}
