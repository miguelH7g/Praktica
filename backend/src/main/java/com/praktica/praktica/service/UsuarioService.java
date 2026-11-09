package com.praktica.praktica.service;

import com.praktica.praktica.model.Usuario;
import com.praktica.praktica.model.Rol;
import com.praktica.praktica.repository.UsuarioRepository;
import com.praktica.praktica.repository.RolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.UUID;

@Service
public class UsuarioService implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    public UsuarioService(UsuarioRepository usuarioRepository, RolRepository rolRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByEmail(email);
        if (usuario == null) {
            throw new UsernameNotFoundException("Usuario no encontrado con el email: " + email);
        }

        return org.springframework.security.core.userdetails.User.builder()
                .username(usuario.getEmail())
                .password(usuario.getContrasena() != null ? usuario.getContrasena() : "")
                .roles(usuario.getRol() != null ? usuario.getRol().getNombreRol().toUpperCase() : "CLIENTE")
                .build();
    }

    public Usuario registrarUsuario(Usuario usuario) {
        if (usuarioRepository.findByEmail(usuario.getEmail()) != null) {
            throw new RuntimeException("El correo ya está registrado");
        }

        Rol rolCliente = rolRepository.findByNombreRol("cliente")
                .orElseThrow(() -> new RuntimeException("Rol 'cliente' no encontrado en la base de datos"));

        usuario.setRol(rolCliente);
        usuario.setContrasena(passwordEncoder.encode(usuario.getContrasena()));

        return usuarioRepository.save(usuario);
    }

    public Usuario loginUsuario(String email, String contrasena) {
        Usuario usuario = usuarioRepository.findByEmail(email);
        if (usuario != null && passwordEncoder.matches(contrasena, usuario.getContrasena())) {
            return usuario;
        }
        return null;
    }

    public Usuario registrarUsuarioDesdeGoogle(String email, String nombre, String apellido) {
        System.out.println("=== registrarUsuarioDesdeGoogle ===");
        System.out.println("Email: " + email);
        System.out.println("Nombre: " + nombre);
        System.out.println("Apellido: " + apellido);

        Usuario usuarioExistente = usuarioRepository.findByEmail(email);
        if (usuarioExistente != null) {
            System.out.println("Usuario ya existe, se hará login: " + email);
            return usuarioExistente;
        }

        Rol rolCliente = rolRepository.findByNombreRol("cliente")
                .orElseThrow(() -> new RuntimeException("Rol 'cliente' no encontrado"));

        String randomPassword = passwordEncoder.encode(UUID.randomUUID().toString());

        Usuario nuevoUsuario = new Usuario();
        nuevoUsuario.setEmail(email);
        nuevoUsuario.setNombre(nombre != null ? nombre : "Google");
        nuevoUsuario.setApellido(apellido != null ? apellido : "User");
        nuevoUsuario.setRol(rolCliente);
        nuevoUsuario.setContrasena(randomPassword);
        nuevoUsuario.setEmpresa(null);

        System.out.println("Registrando nuevo usuario en BD: " + nuevoUsuario);
        

        System.out.println("=== Intentando registrar usuario desde Google ===");
        System.out.println("Email: " + email);
        System.out.println("Nombre: " + nombre);
        System.out.println("Apellido: " + apellido);
        Usuario guardado = usuarioRepository.save(nuevoUsuario);
        System.out.println("Usuario guardado con ID: " + guardado.getIdUsuario());

        System.out.println("Usuario registrado con ID: " + guardado.getIdUsuario());

        return guardado;
    }

    public void cambiarContrasena(String email, String nuevaContrasena) {
    Usuario usuario = usuarioRepository.findByEmail(email);
    if (usuario == null) {
        throw new RuntimeException("Usuario no encontrado");
    }
    if (nuevaContrasena == null || nuevaContrasena.length() < 8) {
        throw new RuntimeException("Tu contraseña debe tener mínimo 8 caracteres");
    }
        usuario.setContrasena(passwordEncoder.encode(nuevaContrasena));
        usuarioRepository.save(usuario);
    }

    public String generarToken(Usuario usuario) {
        return jwtService.generateToken(usuario.getEmail());
    }

    public void encriptarContrasenasExistentes() {
        List<Usuario> usuarios = usuarioRepository.findAll();
        for (Usuario u : usuarios) {
            if (!u.getContrasena().startsWith("$2a$")) {
                u.setContrasena(passwordEncoder.encode(u.getContrasena()));
                                usuarioRepository.save(u);
                }
            }
        }

    public Usuario findByEmail(String email) {
        return usuarioRepository.findByEmail(email);
    }

    public Usuario save(Usuario usuario) {
        return usuarioRepository.save(usuario);
    }

    public List<Usuario> obtenerUsuariosPorRoles() {
        List<String> roles = List.of("administrador", "catalogador", "ventas");
        return usuarioRepository.findByRol_NombreRolIn(roles);
    }

    public Usuario registrarEmpleado(Usuario usuario) {
        if (usuarioRepository.findByEmail(usuario.getEmail()) != null) {
            throw new IllegalArgumentException("El correo ya está registrado");
        }

        List<String> rolesValidos = List.of("administrador", "catalogador", "ventas");
        String nombreRol = usuario.getRol().getNombreRol();

        if (!rolesValidos.contains(nombreRol)) {
            throw new RuntimeException("Rol inválido. Los roles válidos son: 'administrador', 'catalogador' o 'ventas'");
        }

        Rol rol = rolRepository.findByNombreRol(nombreRol)
                .orElseThrow(() -> new RuntimeException("Rol '" + nombreRol + "' no encontrado en la base de datos"));

        usuario.setRol(rol);
        String contrasena = usuario.getContrasena();
        if (contrasena == null || contrasena.length() < 12
                || contrasena.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("La contraseña debe tener entre 12 y 72 bytes (UTF-8)");
        }
        usuario.setContrasena(passwordEncoder.encode(contrasena));

        return usuarioRepository.save(usuario);
    }

    public Usuario findById(Long idUsuario) {
        return usuarioRepository.findById(idUsuario).orElse(null);
    }

    public void actualizarRol(Usuario usuario, String nuevoRol) {
        Rol rol = rolRepository.findByNombreRol(nuevoRol)
                .orElseThrow(() -> new RuntimeException("Rol no encontrado"));
        usuario.setRol(rol);
    }

    public boolean verificarContrasena(Usuario usuario, String passwordIngresada) {
        boolean match = passwordEncoder.matches(passwordIngresada, usuario.getContrasena());
        return match;
    }

    public Page<Usuario> listarEmpleadosPaginados(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        List<String> roles = List.of("administrador", "ventas", "catalogador");
        return usuarioRepository.findByRol_NombreRolIn(roles, pageable);
    }

    public Page<Usuario> buscarEmpleados(String filtro, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        List<String> rolesEmpleados = List.of("administrador", "Catalogador", "Ventas");

        return usuarioRepository
                .findByRol_NombreRolInAndNombreContainingIgnoreCaseOrRol_NombreRolInAndApellidoContainingIgnoreCaseOrRol_NombreRolInAndEmailContainingIgnoreCase(
                        rolesEmpleados, filtro,
                        rolesEmpleados, filtro,
                        rolesEmpleados, filtro,
                        pageable
                );
    }

    public List<Usuario> listarTodos() {
        return usuarioRepository.findAll();
    }

    public long contarClientesConectados() {
        return usuarioRepository.contarClientesConectados();
    }

    public long contarUsuariosConectadosPorRoles(List<Long> roles) {
        return usuarioRepository.countByRol_IdRolInAndEstadoIgnoreCase(roles, "activo");
    }

}
