package com.eventpro.repository;

import com.eventpro.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    List<User> findAllByOrderByNombreAsc();
    long countByRol(String rol);
    List<User> findByRol(String rol);
}
