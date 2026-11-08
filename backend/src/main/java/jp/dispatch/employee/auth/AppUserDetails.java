package jp.dispatch.employee.auth;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class AppUserDetails implements UserDetails {

    private final long id;
    private final String username;
    private final String passwordHash;
    private final String displayName;
    private final Long departmentId;
    private final String affiliationCompany;
    private final Long employeeId;
    private final boolean enabled;
    private final List<String> roles;
    private final List<UserAssignment> assignments;

    public AppUserDetails(
            long id,
            String username,
            String passwordHash,
            String displayName,
            Long departmentId,
            String affiliationCompany,
            Long employeeId,
            boolean enabled,
            List<String> roles
    ) {
        this(id, username, passwordHash, displayName, departmentId, affiliationCompany, employeeId, enabled, roles, List.of());
    }

    public AppUserDetails(
            long id,
            String username,
            String passwordHash,
            String displayName,
            Long departmentId,
            String affiliationCompany,
            Long employeeId,
            boolean enabled,
            List<String> roles,
            List<UserAssignment> assignments
    ) {
        this.id = id;
        this.username = username;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
        this.departmentId = departmentId;
        this.affiliationCompany = affiliationCompany;
        this.employeeId = employeeId;
        this.enabled = enabled;
        this.roles = roles != null ? List.copyOf(roles) : List.of();
        this.assignments = assignments != null ? List.copyOf(assignments) : List.of();
    }

    public long getId() {
        return id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public String getAffiliationCompany() {
        return affiliationCompany;
    }

    public Long getEmployeeId() {
        return employeeId;
    }

    public List<String> getRoles() {
        return roles;
    }

    public List<UserAssignment> getAssignments() {
        return assignments;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream().map(role -> new SimpleGrantedAuthority("ROLE_" + role)).toList();
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
