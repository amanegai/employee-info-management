package jp.dispatch.employee.service;

import jp.dispatch.employee.repository.TotpRecoveryCodeRepository;
import jp.dispatch.employee.repository.TotpRecoveryCodeRepository.RecoveryCodeRow;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TotpRecoveryCodeServiceTest {

    @Mock
    private TotpRecoveryCodeRepository repository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private TotpRecoveryCodeService service;

    @Test
    void looksLikeRecoveryCode_detectsFormattedCode() {
        assertTrue(TotpRecoveryCodeService.looksLikeRecoveryCode("ABCD-EFGH"));
        assertTrue(TotpRecoveryCodeService.looksLikeRecoveryCode("abcd efgh"));
        assertFalse(TotpRecoveryCodeService.looksLikeRecoveryCode("123456"));
        assertFalse(TotpRecoveryCodeService.looksLikeRecoveryCode(null));
    }

    @Test
    void regenerate_createsTenCodes() {
        when(passwordEncoder.encode(anyString())).thenAnswer(inv -> "hash-" + inv.getArgument(0));

        List<String> codes = service.regenerate(42L);

        assertEquals(10, codes.size());
        codes.forEach(code -> assertTrue(code.matches("[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}")));
        verify(repository).deleteByUserId(42L);
        verify(repository, org.mockito.Mockito.times(10)).insert(eq(42L), anyString(), anyString());
    }

    @Test
    void tryConsume_marksMatchingCodeAsUsed() {
        when(repository.findUnusedByUserId(7L)).thenReturn(List.of(new RecoveryCodeRow(99L, "stored-hash")));
        when(passwordEncoder.matches("ABCD1234", "stored-hash")).thenReturn(true);

        assertTrue(service.tryConsume(7L, "ABCD-1234"));

        ArgumentCaptor<String> usedAtCaptor = ArgumentCaptor.forClass(String.class);
        verify(repository).markUsed(eq(99L), usedAtCaptor.capture());
        assertFalse(usedAtCaptor.getValue().isBlank());
    }

    @Test
    void tryConsume_rejectsInvalidLength() {
        assertFalse(service.tryConsume(7L, "ABC"));
        assertFalse(service.tryConsume(7L, "123456"));
    }
}
